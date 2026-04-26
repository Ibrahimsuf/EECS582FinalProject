import logging
from decimal import Decimal

import google.generativeai as genai
from django.conf import settings
from django.db import models
from django.dispatch import receiver
from django.db.models.signals import post_save
logger = logging.getLogger(__name__)


class Sprint(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    group = models.ForeignKey(
        "Group",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sprints",
    )

    def __str__(self):
        return self.name


class Group(models.Model):
    name = models.CharField(max_length=100)
    group_code = models.IntegerField()

    def __str__(self):
        return self.name


class Project(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="projects",
    )

    def __str__(self):
        return self.name

    def get_timeline(self):
        timeline = []
        if not self.group:
            return timeline

        for sprint in self.group.sprints.order_by("start_date"):
            sprint_info = {
                "sprint_name": sprint.name,
                "start_date": sprint.start_date,
                "end_date": sprint.end_date,
                "tasks": [
                    {
                        "title": task.title,
                        "status": task.status,
                        "members": [member.name for member in task.member.all()],
                    }
                    for task in sprint.tasks.all()
                ],
            }
            timeline.append(sprint_info)
        return timeline


class Member(models.Model):
    MEMBER_ROLES = [
        ("PROJECT_MANAGER", "Project Manager"),
        ("TEAM_MEMBER", "Team Member"),
    ]

    name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100, default="")
    last_name = models.CharField(max_length=100, default="")
    email = models.EmailField(max_length=100, unique=True)
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=100)
    roles = models.CharField(max_length=20, choices=MEMBER_ROLES, default="TEAM_MEMBER")

    university = models.CharField(max_length=200, blank=True, default="")
    address = models.JSONField(blank=True, default=dict)
    photo = models.TextField(blank=True, default="")

    github_username = models.CharField(max_length=100, blank=True, default="")
    github_token = models.CharField(max_length=200, blank=True, default="")
    google_account = models.EmailField(max_length=200, blank=True, default="")
    github_linked = models.BooleanField(default=False)
    google_linked = models.BooleanField(default=False)

    group = models.ManyToManyField(Group, related_name="members", blank=True)
    project = models.ManyToManyField(Project, related_name="members", blank=True)

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=100)
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="tags",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tags",
    )

    class Meta:
        unique_together = ("name", "group")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} (Group: {self.group.name})"

class Task(models.Model):
    STATUS_CHOICES = [
        ("BACKLOG", "Backlog"),
        ("TODO", "To-Do"),
        ("IN_PROGRESS", "In Progress"),
        ("DONE", "Done"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="BACKLOG")

    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )

    member = models.ManyToManyField(Member, related_name="tasks", blank=True)
    tags = models.ManyToManyField(
        Tag,
        related_name="tasks",
        blank=True,
    )
    created_by = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    actual_hours = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    ai_estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    discrepancy_rating = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    is_estimation_outlier = models.BooleanField(default=False)
    estimation_analysis = models.TextField(blank=True, default="")

    def __str__(self):
        return self.title
        
class TaskComment(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="task_comments",
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.task.title}"

class Story_Point_Estimates(models.Model):
    point_estimate = models.IntegerField()
    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="story_point_estimates",
    )
    member = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="story_point_estimates",
    )

    def __str__(self):
        return f"{self.member} - {self.point_estimate}"
class Discrepancy(models.Model):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="discrepancies",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="discrepancies",
    )
    # negative one means no user contribution
    user_contribution = models.IntegerField(default=-1)

class SprintContribution(models.Model):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="sprint_contributions",
    )
    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.CASCADE,
        related_name="contributions",
    )
    description = models.TextField(blank=True, default="")
    story_points = models.IntegerField(default=0)
    hours_worked = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    tasks_handled = models.ManyToManyField(Task, blank=True, related_name="contribution_entries")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    has_overlapping_contributions = models.BooleanField(default=False)

    # go through each sprint contribution for this sprint
    # and flag the sprint if the contributions have overlapping information
    def is_overlapping(self):
        contributions = SprintContribution.objects.filter(sprint=self.sprint).exclude(member=self.member)

        if not contributions.exists():
            return False

        # Build a list of descriptions to compare against
        other_descriptions = [c.description for c in contributions if c.description]

        if not other_descriptions or not self.description:
            return False

        # Ask Gemini to evaluate semantic overlap
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
        You are reviewing sprint contributions for a software team.

        Your task: determine if the following contribution description overlaps meaningfully 
        in content or scope with any of the other contributions listed.

        Respond ONLY with a JSON object in this exact format:
        {{"overlapping": true/false, "reason": "brief explanation"}}

        --- Contribution to check ---
        {self.description}

        --- Other contributions in this sprint ---
        {json.dumps(other_descriptions, indent=2)}
        """
        try:
            response = model.generate_content(prompt)
            raw = response.text.strip().removeprefix("```json").removesuffix("```").strip()
            result = json.loads(raw)
            return result.get("overlapping", False)
        except (json.JSONDecodeError, Exception) as e:
            # Fail open — don't block on API errors
            print(f"Gemini overlap check failed: {e}")
            return False

    class Meta:
        unique_together = ("member", "sprint")

    def __str__(self):
        return f"{self.member} – Sprint {self.sprint}"


class ContributionReaction(models.Model):
    REACTION_CHOICES = [
        ("LOOKS_GOOD", "Looks good to me"),
        ("NEEDS_CLARIFICATION", "Needs clarification"),
        ("NEEDS_MORE_DETAIL", "Needs more detail"),
        ("GREAT_PROGRESS", "Great progress"),
    ]

    contribution = models.ForeignKey(
        SprintContribution,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="contribution_reactions",
    )
    reaction = models.CharField(max_length=20, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("contribution", "member")

    def __str__(self):
        return f"{self.member} reacted {self.reaction} to {self.contribution}"


class Dispute(models.Model):
    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("UNDER_REVIEW", "Under Review"),
        ("RESOLVED", "Resolved"),
        ("DISMISSED", "Dismissed"),
    ]

    raised_by = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="disputes_raised",
    )
    accused_member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="disputes_received",
    )
    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes",
    )
    contribution = models.ForeignKey(
        "SprintContribution",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes",
    )
    description = models.TextField(blank=True, default="")
    tasks_affected = models.ManyToManyField(Task, blank=True, related_name="disputes")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    ai_resolution = models.TextField(blank=True, default="")
    ai_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dispute #{self.id} - {self.status}"

@receiver(post_save, sender=SprintContribution)
def check_contribution_overlap(sender, instance, **kwargs):
    if not instance.description:
        return

    sprint = instance.sprint

    if instance.is_overlapping():
        sprint.has_overlapping_contributions = True
    else:
        # Re-check all contributions in case this edit resolved the overlap
        sprint.has_overlapping_contributions = any(
            c.is_overlapping()
            for c in SprintContribution.objects.filter(sprint=sprint)
            if c.description
        )

    sprint.save(update_fields=["has_overlapping_contributions"])
