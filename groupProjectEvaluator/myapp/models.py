from django.db import models

# Description: Django Models database models for various tables
# Programmer(s): Abhriroop Goel, Dylan Kneidel, Ian Lim, Kit Magar, Bryce Martin, Ibrahim Sufi 
# Created: 2026-2-25
# Revised: 2026-2-25


class Sprint(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

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
        on_delete = models.SET_NULL,
        blank= True,
        null = True,
        related_name= 'projects'
    )

    def __str__(self):
        return self.name
    
class Member(models.Model):
    MEMBER_ROLES =[
        ('PROJECT_MANAGER', 'Project Manager'),
        ('TEAM_MEMBER', 'Team Member')
    ]
    name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    username =models.CharField(max_length=100)
    password = models.CharField(max_length=100)
    roles = models.CharField(
        max_length=20,
        choices=MEMBER_ROLES,
        default='TEAM_MEMBER'
    )
    group = models.ManyToManyField(
        Group,
        related_name='members'
    )
    project = models.ManyToManyField(
        Project,
        related_name='project'

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


