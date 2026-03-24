from rest_framework import serializers
from .models import Task, Sprint, Member, Project, Group, SprintContribution, Dispute


class SprintSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True, default=None)

    class Meta:
        model = Sprint
        fields = "__all__"


class TaskSerializer(serializers.ModelSerializer):
    assigned_members = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

    def get_assigned_members(self, obj):
        return [{"id": m.id, "name": m.name, "role": m.roles} for m in obj.member.all()]

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "requirements",
            "status",
            "sprint",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_name",
            "member",
            "assigned_members",
        ]


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"


class MemberSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    github_token = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Member
        fields = [
            "id",
            "name",
            "first_name",
            "last_name",
            "email",
            "username",
            "password",
            "roles",
            "university",
            "address",
            "photo",
            "group",
            "project",
            "github_username",
            "github_token",
            "google_account",
            "github_linked",
            "google_linked",
        ]


class SprintContributionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.name", read_only=True)
    sprint_name = serializers.CharField(source="sprint.name", read_only=True)

    class Meta:
        model = SprintContribution
        fields = [
            "id",
            "member",
            "member_name",
            "sprint",
            "sprint_name",
            "description",
            "story_points",
            "hours_worked",
            "tasks_handled",
            "submitted_at",
            "updated_at",
        ]


class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.name", read_only=True)
    accused_member_name = serializers.CharField(source="accused_member.name", read_only=True)
    sprint_name = serializers.CharField(source="sprint.name", read_only=True)
    contribution_summary = serializers.SerializerMethodField()

    def get_contribution_summary(self, obj):
        if not obj.contribution:
            return None
        c = obj.contribution
        return {
            "id": c.id,
            "sprint_name": c.sprint.name if c.sprint else None,
            "story_points": c.story_points,
            "hours_worked": str(c.hours_worked),
        }

    class Meta:
        model = Dispute
        fields = [
            "id",
            "raised_by",
            "raised_by_name",
            "accused_member",
            "accused_member_name",
            "sprint",
            "sprint_name",
            "contribution",
            "contribution_summary",
            "description",
            "tasks_affected",
            "status",
            "created_at",
            "updated_at",
        ]
