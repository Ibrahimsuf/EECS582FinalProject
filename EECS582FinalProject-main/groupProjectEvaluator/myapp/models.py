from django.db import models
from django.contrib.auth.models import AbstractUser
import secrets
import string


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Uses email as the primary identifier for authentication.
    """
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email


class Sprint(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sprints', null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Task(models.Model):
    STATUS_CHOICES = [
        ('BACKLOG', 'Backlog'),
        ('TODO', 'To-Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='BACKLOG'
    )
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_tasks')

    # If sprint is NULL, the task is considered in the "Global Backlog"
    sprint = models.ForeignKey(
        Sprint, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='tasks'
    )

    member = models.ManyToManyField(
        "Member",
        related_name="tasks",
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    
def generate_join_code():
    """Generate a unique 8-character join code for groups"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))


class Group(models.Model):
    name = models.CharField(max_length=100)
    group_code = models.IntegerField(null=True, blank=True)  # Keep for backward compatibility
    join_code = models.CharField(max_length=8, unique=True, default=generate_join_code)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_groups')
    members = models.ManyToManyField(User, related_name='member_groups', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Project(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects', null=True)
    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='projects'
    )

    def __str__(self):
        return self.name
    
class Member(models.Model):
    """
    Member represents additional profile/role information for users in the context of groups/projects.
    Authentication is handled by the User model.
    """
    MEMBER_ROLES = [
        ('PROJECT_MANAGER', 'Project Manager'),
        ('TEAM_MEMBER', 'Team Member')
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='member_profiles')
    name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    roles = models.CharField(
        max_length=20,
        choices=MEMBER_ROLES,
        default='TEAM_MEMBER'
    )
    group = models.ManyToManyField(
        Group,
        related_name='team_members',
        blank=True
    )
    project = models.ManyToManyField(
        Project,
        related_name='team_members',
        blank=True
    )
    
    def __str__(self):
        return self.name

class Story_Point_Estimates(models.Model):
    point_estimate = models.IntegerField()
    sprint = models.ForeignKey(
        Sprint,
        on_delete = models.SET_NULL,
        blank= True,
        null = True,
        related_name= 'sprint'
    )
    member= models.ForeignKey(
        Member,
        on_delete = models.SET_NULL,
        blank= True,
        null = True,
        related_name= 'member'
    )
    def __str__(self):
     return f"{self.member} - {self.point_estimate}"


