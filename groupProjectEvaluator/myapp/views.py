from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Task, Sprint, Member, Group, Project
from .serializers import (
    TaskSerializer,
    SprintSerializer,
    MemberSerializer,
    GroupSerializer,
    ProjectSerializer,
)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.all()
        sprint_id = self.request.query_params.get("sprint_id")
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)
        return qs

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        member_id = request.data.get("member_id")

        # Only allow assigned members to change status
        if member_id:
            if not task.member.filter(id=member_id).exists():
                return Response(
                    {"error": "You are not assigned to this task."},
                    status=status.HTTP_403_FORBIDDEN
                )

        return super().partial_update(request, *args, **kwargs)

class SprintViewSet(viewsets.ModelViewSet):
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


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

    if not group_code or not member_id:
        return Response({"error": "group_code and member_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        group = Group.objects.get(group_code=int(group_code))
    except Group.DoesNotExist:
        return Response({"error": "Invalid group code. No group found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        member = Member.objects.get(id=member_id)
    except Member.DoesNotExist:
        return Response({"error": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

    member.group.add(group)
    return Response({"message": "Joined successfully.", "group_name": group.name}, status=status.HTTP_200_OK)