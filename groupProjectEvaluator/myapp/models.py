from django.db import models


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

    # ✅ Profile extras (persisted)
    university = models.CharField(max_length=200, blank=True, default="")
    address = models.JSONField(blank=True, default=dict)
    photo = models.TextField(blank=True, default="")  # dataURL or URL (demo)

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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="BACKLOG")

    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )

    member = models.ManyToManyField(Member, related_name="tasks", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
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
        # one entry per member per sprint
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

    def __str__(self):
        return f"Dispute by {self.raised_by} against {self.accused_member} ({self.status})"