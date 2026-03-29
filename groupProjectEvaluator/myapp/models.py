import logging

import google.generativeai as genai
from django.conf import settings
from django.db import models

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
        """Returns a list of sprints with their tasks for timeline visualization."""
        timeline = []
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
    password = models.CharField(max_length=100)  # demo-only (plain text)
    roles = models.CharField(max_length=20, choices=MEMBER_ROLES, default="TEAM_MEMBER")

    university = models.CharField(max_length=200, blank=True, default="")
    address = models.JSONField(blank=True, default=dict)
    photo = models.TextField(blank=True, default="")

    # GitHub and Google integration fields
    github_username = models.CharField(max_length=100, blank=True, default="")
    github_token = models.CharField(max_length=200, blank=True, default="")  # for personal access token
    google_account = models.EmailField(max_length=200, blank=True, default="")
    github_linked = models.BooleanField(default=False)
    google_linked = models.BooleanField(default=False)

    group = models.ManyToManyField(Group, related_name="members", blank=True)
    project = models.ManyToManyField(Project, related_name="members", blank=True)

    def __str__(self):
        return self.name


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
    created_by = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


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
    """A member's self-reported contribution summary for a sprint."""

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

    class Meta:
        unique_together = ("member", "sprint")

    def __str__(self):
        return f"{self.member} – Sprint {self.sprint}"


class Dispute(models.Model):
    """A concern raised by one member about another member's contributions."""

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
    description = models.TextField()
    tasks_affected = models.ManyToManyField(Task, blank=True, related_name="disputes")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Gemini AI evaluation fields (populated automatically on creation)
    ai_resolved = models.BooleanField(
        null=True,
        blank=True,
        help_text="AI verdict: True = resolved, False = unresolved, None = not yet evaluated.",
    )
    ai_resolution = models.TextField(
        blank=True,
        default="",
        help_text="Full explanation returned by the Gemini AI evaluation.",
    )

    def __str__(self):
        return f"Dispute by {self.raised_by} against {self.accused_member} ({self.status})"

    # ------------------------------------------------------------------
    # Gemini AI evaluation
    # ------------------------------------------------------------------
    def _build_evaluation_prompt(self) -> str:
        """Build the prompt sent to Gemini for dispute evaluation."""
        contribution_info = ""
        if self.contribution:
            c = self.contribution
            contribution_info = (
                f"\n\nContribution under dispute:\n"
                f"  Member: {c.member}\n"
                f"  Sprint: {c.sprint}\n"
                f"  Description: {c.description}\n"
                f"  Story Points: {c.story_points}\n"
                f"  Hours Worked: {c.hours_worked}"
            )

        return (
            "You are an impartial evaluator for a software engineering group project.\n"
            "A team member has raised a dispute about a peer's contribution.\n\n"
            f"Raised by: {self.raised_by}\n"
            f"Accused member: {self.accused_member}\n"
            f"Sprint: {self.sprint}\n"
            f"Dispute description: {self.description}"
            f"{contribution_info}\n\n"
            "Based solely on the information above, determine whether this dispute appears "
            "to already be resolved or can be considered resolved without further action.\n\n"
            "Reply in this exact format:\n"
            "RESOLVED: <yes|no>\n"
            "EXPLANATION: <one or two sentences explaining your reasoning>"
        )

    def _evaluate_with_gemini(self) -> None:
        """Call the Gemini API and populate ai_resolved / ai_resolution."""
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not api_key:
            logger.warning("GEMINI_API_KEY not set – skipping AI evaluation for Dispute.")
            return

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(self._build_evaluation_prompt())
            text = response.text.strip()

            # Parse the structured reply
            resolved_line = ""
            explanation_line = ""
            for line in text.splitlines():
                if line.upper().startswith("RESOLVED:"):
                    resolved_line = line.split(":", 1)[1].strip().lower()
                elif line.upper().startswith("EXPLANATION:"):
                    explanation_line = line.split(":", 1)[1].strip()

            self.ai_resolved = resolved_line == "yes"
            self.ai_resolution = explanation_line or text
        except Exception as exc:  # noqa: BLE001
            logger.error("Gemini evaluation failed for dispute: %s", exc)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self._evaluate_with_gemini()
            # Use update() to avoid triggering save() again (avoids infinite loop
            # and auto_now timestamp bumps on the same object).
            type(self).objects.filter(pk=self.pk).update(
                ai_resolved=self.ai_resolved,
                ai_resolution=self.ai_resolution,
            )
