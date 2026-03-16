from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response

from .models import Task, Sprint, Member, Group, Project, SprintContribution, Dispute
from .serializers import (
    TaskSerializer,
    SprintSerializer,
    MemberSerializer,
    GroupSerializer,
    ProjectSerializer,
    SprintContributionSerializer,
    DisputeSerializer,
)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().prefetch_related("member")
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.all().prefetch_related("member")
        sprint_id = self.request.query_params.get("sprint_id")
        group_id = self.request.query_params.get("group_id")
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)
        if group_id:
            qs = qs.filter(models.Q(sprint__group_id=group_id) | models.Q(member__group__id=group_id)).distinct()
        return qs

    def _get_actor(self, request):
        actor_id = request.data.get("actor_id") or request.query_params.get("actor_id")
        if not actor_id:
            return None
        return Member.objects.filter(id=actor_id).first()

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        actor = self._get_actor(request)
        if not actor:
            return Response({"error": "actor_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        is_manager = actor.roles == "PROJECT_MANAGER"
        is_assigned = task.member.filter(id=actor.id).exists()

        allowed_status_only = {"status", "actor_id"}
        incoming_keys = set(request.data.keys())

        if is_manager:
            return super().partial_update(request, *args, **kwargs)

        if is_assigned and incoming_keys.issubset(allowed_status_only):
            return super().partial_update(request, *args, **kwargs)

        return Response(
            {
                "error": "Only project managers can edit task details. Assigned members may only update status."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    def update(self, request, *args, **kwargs):
        actor = self._get_actor(request)
        if not actor or actor.roles != "PROJECT_MANAGER":
            return Response(
                {"error": "Only project managers can fully edit task pages."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        actor = self._get_actor(request)
        if not actor or actor.roles != "PROJECT_MANAGER":
            return Response(
                {"error": "Only project managers can create tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = request.data.copy()
        payload["created_by"] = actor.id
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        actor = self._get_actor(request)
        if not actor or actor.roles != "PROJECT_MANAGER":
            return Response(
                {"error": "Only project managers can delete tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class SprintViewSet(viewsets.ModelViewSet):
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer

    def get_queryset(self):
        qs = Sprint.objects.all()
        group_id = self.request.query_params.get("group_id")
        is_active = self.request.query_params.get("is_active")
        if group_id:
            qs = qs.filter(group_id=group_id)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        project = self.get_object()
        timeline_data = project.get_timeline()
        return Response(timeline_data)


class SprintContributionViewSet(viewsets.ModelViewSet):
    queryset = SprintContribution.objects.all()
    serializer_class = SprintContributionSerializer

    def get_queryset(self):
        qs = SprintContribution.objects.all()
        member_id = self.request.query_params.get("member_id")
        sprint_id = self.request.query_params.get("sprint_id")
        group_id = self.request.query_params.get("group_id")
        if member_id:
            qs = qs.filter(member_id=member_id)
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)
        if group_id:
            qs = qs.filter(sprint__group_id=group_id)
        return qs


class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.all()
    serializer_class = DisputeSerializer

    def get_queryset(self):
        qs = Dispute.objects.all()
        member_id = self.request.query_params.get("member_id")
        role = self.request.query_params.get("role")

        if role == "PROJECT_MANAGER":
            pass
        elif member_id:
            qs = qs.filter(
                models.Q(raised_by_id=member_id) | models.Q(accused_member_id=member_id)
            )

        sprint_id = self.request.query_params.get("sprint_id")
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)

        return qs


@api_view(["POST"])
def register(request):
    data = request.data or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    first_name = (data.get("first_name") or name or "User").strip()
    last_name = (data.get("last_name") or "").strip()
    username = (data.get("username") or (email.split("@")[0] if "@" in email else email) or "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    if Member.objects.filter(email__iexact=email).exists():
        return Response({"error": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)

    if username and Member.objects.filter(username__iexact=username).exists():
        return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

    member = Member.objects.create(
        name=name or f"{first_name} {last_name}".strip() or "User",
        first_name=first_name,
        last_name=last_name,
        email=email,
        username=username or email,
        password=password,
    )

    return Response(MemberSerializer(member).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def login(request):
    data = request.data or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not identifier or not password:
        return Response({"error": "Identifier and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    member = (
        Member.objects.filter(email__iexact=identifier, password=password).first()
        or Member.objects.filter(username__iexact=identifier, password=password).first()
    )

    if not member:
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(MemberSerializer(member).data, status=status.HTTP_200_OK)


@api_view(["POST"])
def join_group(request):
    data = request.data or {}
    group_code = data.get("group_code")
    member_id = data.get("member_id")
    role = data.get("role", "TEAM_MEMBER")
    # Default to TEAM_MEMBER if not provided

    if not group_code or not member_id:
        return Response({"error": "group_code and member_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    valid_roles = dict(Member.MEMBER_ROLES)
    if role not in valid_roles:
        return Response({"error": f"Invalid role. Must be one of {list(valid_roles.keys())}"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        group = Group.objects.get(group_code=int(group_code))
    except Group.DoesNotExist:
        return Response({"error": "Invalid group code. No group found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        member = Member.objects.get(id=member_id)
    except Member.DoesNotExist:
        return Response({"error": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

    member.group.add(group)

    # Set the role if provided
    if role != "TEAM_MEMBER":  # Only update if it's not the default
        member.roles = role
        member.save()

    return Response({
        "message": "Joined successfully.",
        "group_name": group.name,
        "role": member.roles
    }, status=status.HTTP_200_OK)
