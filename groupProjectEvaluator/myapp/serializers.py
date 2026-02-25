from rest_framework import serializers
from .models import Task, Sprint, Member, Project, Group


class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = "__all__"


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "description", "status", "sprint", "created_at", "member"]


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
        ]
