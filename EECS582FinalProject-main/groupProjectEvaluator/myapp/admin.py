from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Task, Sprint, Group, Project, Member, Story_Point_Estimates


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'name', 'username', 'is_staff', 'date_joined']
    search_fields = ['email', 'name', 'username']
    ordering = ['-date_joined']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'owner', 'sprint', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'description']


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active', 'start_date']
    search_fields = ['name']


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'join_code', 'created_at']
    search_fields = ['name', 'join_code']
    readonly_fields = ['join_code']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'group', 'start_date', 'end_date']
    list_filter = ['start_date']
    search_fields = ['name']


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'roles']
    list_filter = ['roles']
    search_fields = ['name']


@admin.register(Story_Point_Estimates)
class StoryPointEstimatesAdmin(admin.ModelAdmin):
    list_display = ['member', 'point_estimate', 'sprint']
    list_filter = ['sprint']
