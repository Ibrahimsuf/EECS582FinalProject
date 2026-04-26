from decimal import Decimal

import requests
from django.db import models
from django.db.models import Avg
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Dispute, Group, Member, Project, Sprint, SprintContribution, Task, TaskComment, Tag
from .serializers import (
    
    DisputeSerializer,
    GroupSerializer,
    MemberSerializer,
    ProjectSerializer,
    SprintContributionSerializer,
    SprintSerializer,
    TaskSerializer,
    TaskCommentSerializer,
    TagSerializer,
)


def _to_decimal(value, default="0.00"):
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _count_keywords(text, words):
    content = (text or "").lower()
    return sum(content.count(word) for word in words)


def generate_task_estimation_analysis(task):
    group_id = task.sprint.group_id if task.sprint and task.sprint.group_id else None
    historical_qs = Task.objects.exclude(id=task.id)
    if group_id:
        historical_qs = historical_qs.filter(sprint__group_id=group_id)

    historical_with_actuals = historical_qs.filter(actual_hours__gt=0)
    historical_avg = historical_with_actuals.aggregate(avg=Avg("actual_hours"))["avg"]
    historical_avg = _to_decimal(historical_avg or "0.00")

    complexity_text = f"{task.title} {task.description} {task.requirements}"
    complexity_score = 1
    complexity_score += _count_keywords(
        complexity_text,
        [
            "api",
            "auth",
            "database",
            "migration",
            "dashboard",
            "real-time",
            "analytics",
            "integration",
            "testing",
            "deploy",
            "bug",
            "ai",
        ],
    )
    complexity_score += max(len((task.requirements or "").splitlines()) - 1, 0) * 0.25
    complexity_score += min(len((task.description or "").split()) / 40, 2)

    base_estimate = _to_decimal(task.estimated_hours or "0.00")
    if base_estimate <= 0:
        base_estimate = historical_avg if historical_avg > 0 else Decimal("4.00")

    refined_estimate = max(base_estimate, Decimal("1.00")) * Decimal(str(round(1 + (complexity_score - 1) * 0.12, 2)))
    refined_estimate = refined_estimate.quantize(Decimal("0.01"))

    actual_hours = _to_decimal(task.actual_hours or "0.00")
    discrepancy_rating = Decimal("0.00")
    is_outlier = False

    if actual_hours > 0 and refined_estimate > 0:
        discrepancy_ratio = abs(actual_hours - refined_estimate) / refined_estimate
        discrepancy_rating = (discrepancy_ratio * Decimal("100")).quantize(Decimal("0.01"))
        is_outlier = discrepancy_ratio >= Decimal("0.50")

    reasons = []
    if actual_hours <= 0:
        reasons.append("Actual hours have not been logged yet, so this estimate is predictive only.")
    else:
        if actual_hours > refined_estimate:
            reasons.append("Actual effort exceeded the refined estimate, which may indicate hidden complexity or technical debt.")
        elif actual_hours < refined_estimate:
            reasons.append("Actual effort came in below the refined estimate, which may indicate over-estimation or unusually smooth execution.")
        else:
            reasons.append("Actual effort closely matched the refined estimate.")

    if historical_avg > 0:
        reasons.append(f"Group historical average actual time is {historical_avg} hours for comparable work.")

    if is_outlier:
        reasons.append("This task is flagged as an outlier because the gap between estimated and actual time is 50% or more.")

    analysis = " ".join(reasons).strip()

    return {
        "estimated_hours": base_estimate.quantize(Decimal("0.01")),
        "ai_estimated_hours": refined_estimate,
        "actual_hours": actual_hours.quantize(Decimal("0.01")),
        "discrepancy_rating": discrepancy_rating,
        "is_estimation_outlier": is_outlier,
        "estimation_analysis": analysis,
    }

from rest_framework.decorators import action

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

    def get_queryset(self):
        qs = Tag.objects.all()
        group_id = self.request.query_params.get("group_id")
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        # Automatically set the group based on the authenticated user's group
        # or from the request data
        group_id = self.request.data.get("group")
        if not group_id:
            return Response(
                {"error": "group is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response(
                {"error": "Group not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(group=group, created_by=user)

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user_id") or request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            user = Member.objects.get(id=user_id)
        except Member.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        group_id = request.data.get("group")
        if not group_id:
            return Response(
                {"error": "group is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response(
                {"error": "Group not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        if not user.group.filter(id=group.id).exists():
            return Response(
                {"error": "User is not a member of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        group_id = self.request.data.get("group")
        user_id = self.request.data.get("user_id")
        group = Group.objects.get(id=group_id)
        user = Member.objects.get(id=user_id)
        serializer.save(group=group, created_by=user)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().prefetch_related("member")
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.all().prefetch_related("member", "tags")
        sprint_id = self.request.query_params.get("sprint_id")
        group_id = self.request.query_params.get("group_id")
        tag_id = self.request.query_params.get("tag_id")
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)
        if group_id:
            qs = qs.filter(
                models.Q(sprint__group_id=group_id) | models.Q(member__group__id=group_id)
            ).distinct()
        if tag_id:
            qs = qs.filter(tags__id=tag_id).distinct()
        return qs

    def _get_actor(self, request):
        actor_id = request.data.get("actor_id") or request.query_params.get("actor_id")
        if not actor_id:
            return None
        return Member.objects.filter(id=actor_id).first()

    def perform_create(self, serializer):
        task = serializer.save()
        analysis = generate_task_estimation_analysis(task)
        for field, value in analysis.items():
            setattr(task, field, value)
        task.save()

    def perform_update(self, serializer):
        task = serializer.save()
        analysis = generate_task_estimation_analysis(task)
        for field, value in analysis.items():
            setattr(task, field, value)
        task.save()

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        actor = self._get_actor(request)
        if not actor:
            return Response({"error": "actor_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        is_manager = actor.roles == "PROJECT_MANAGER"
        is_assigned = task.member.filter(id=actor.id).exists()
        allowed_status_only = {"status", "actor_id"}
        incoming_keys = set(request.data.keys())

        if "status" in incoming_keys and not is_assigned:
            return Response(
                {"error": "Only assigned members can update task status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if is_manager:
            return super().partial_update(request, *args, **kwargs)

        if is_assigned and incoming_keys.issubset(allowed_status_only):
            return super().partial_update(request, *args, **kwargs)

        return Response(
            {"error": "Only project managers can edit task details. Assigned members may only update status."},
            status=status.HTTP_403_FORBIDDEN,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.get("partial", False)
        if not partial:
            actor = self._get_actor(request)
            if not actor or actor.roles != "PROJECT_MANAGER":
                return Response(
                    {"error": "Only project managers can fully edit task pages."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        actor = self._get_actor(request)
        if not actor:
            return Response({"error": "actor_id is required."}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=True, methods=["get"], url_path="analysis")
    def analysis(self, request, pk=None):
        task = self.get_object()
        analysis = generate_task_estimation_analysis(task)
        return Response(
            {
                "task_id": task.id,
                "title": task.title,
                **{k: str(v) if isinstance(v, Decimal) else v for k, v in analysis.items()},
            }
        )

class TaskCommentViewSet(viewsets.ModelViewSet):
    queryset = TaskComment.objects.all().select_related("task", "author")
    serializer_class = TaskCommentSerializer

    def get_queryset(self):
        qs = TaskComment.objects.all().select_related("task", "author")
        task_id = self.request.query_params.get("task_id")

        if task_id:
            qs = qs.filter(task_id=task_id)

        return qs.order_by("created_at")

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        author_id = payload.get("author") or payload.get("author_id") or payload.get("actor_id")
        text = (payload.get("text") or "").strip()
        task_id = payload.get("task")

        if not task_id:
            return Response({"error": "task is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not author_id:
            return Response({"error": "author is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not text:
            return Response({"error": "Comment text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        if not Task.objects.filter(id=task_id).exists():
            return Response({"error": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        if not Member.objects.filter(id=author_id).exists():
            return Response({"error": "Author not found."}, status=status.HTTP_404_NOT_FOUND)

        payload["author"] = author_id
        payload["text"] = text

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

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

    def get_queryset(self):
        qs = Member.objects.all()
        group_id = self.request.query_params.get("group_id")
        if group_id:
            qs = qs.filter(group__id=group_id).distinct()
        return qs

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        project = self.get_object()
        return Response(project.get_timeline())


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

        if role != "PROJECT_MANAGER" and member_id:
            qs = qs.filter(models.Q(raised_by_id=member_id) | models.Q(accused_member_id=member_id))

        sprint_id = self.request.query_params.get("sprint_id")
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)

        return qs


@api_view(["GET"])
def instructor_discrepancy_dashboard(request):
    group_id = request.query_params.get("group_id")
    task_qs = Task.objects.all().select_related("sprint", "sprint__group")
    if group_id:
        task_qs = task_qs.filter(sprint__group_id=group_id)

    groups = Group.objects.filter(id=group_id) if group_id else Group.objects.all()
    group_cards = []
    all_discrepancies = []
    total_outliers = 0

    for group in groups:
        group_tasks = task_qs.filter(sprint__group=group)
        task_count = group_tasks.count()
        if task_count == 0:
            avg_discrepancy = Decimal("0.00")
            outlier_count = 0
        else:
            avg_discrepancy = group_tasks.aggregate(avg=Avg("discrepancy_rating"))["avg"] or Decimal("0.00")
            avg_discrepancy = _to_decimal(avg_discrepancy)
            outlier_count = group_tasks.filter(is_estimation_outlier=True).count()
            all_discrepancies.extend([_to_decimal(v) for v in group_tasks.values_list("discrepancy_rating", flat=True)])
            total_outliers += outlier_count

        risk_level = "LOW"
        if avg_discrepancy >= Decimal("50") or outlier_count >= 2:
            risk_level = "HIGH"
        elif avg_discrepancy >= Decimal("25") or outlier_count >= 1:
            risk_level = "MEDIUM"

        group_cards.append(
            {
                "group_id": group.id,
                "group_name": group.name,
                "task_count": task_count,
                "average_discrepancy_rating": str(avg_discrepancy.quantize(Decimal("0.01"))),
                "outlier_count": outlier_count,
                "risk_level": risk_level,
                "needs_attention": risk_level in {"MEDIUM", "HIGH"},
            }
        )

    overall_avg = Decimal("0.00")
    if all_discrepancies:
        overall_avg = (sum(all_discrepancies) / Decimal(len(all_discrepancies))).quantize(Decimal("0.01"))

    return Response(
        {
            "group_count": len(group_cards),
            "at_risk_groups": sum(1 for item in group_cards if item["needs_attention"]),
            "total_outliers": total_outliers,
            "overall_average_discrepancy": str(overall_avg),
            "groups": group_cards,
        }
    )


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
    
@api_view(["POST"])
def leave_group(request):
    data = request.data or {}
    group_id = data.get("group_id")
    member_id = data.get("member_id")

    if not group_id or not member_id:
        return Response({"error": "group_id and member_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        group = Group.objects.get(id=group_id)
    except Group.DoesNotExist:
        return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        member = Member.objects.get(id=member_id)
    except Member.DoesNotExist:
        return Response({"error": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

    if not member.group.filter(id=group.id).exists():
        return Response({"error": "You are not a member of this group."}, status=status.HTTP_400_BAD_REQUEST)

    member.group.remove(group)
    return Response(
        {
            "message": f'You left "{group.name}" successfully.',
            "group_id": group.id,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def github_contributions(request, member_id):
    try:
        member = Member.objects.get(id=member_id)
    except Member.DoesNotExist:
        return Response({"error": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

    if not member.github_username:
        return Response({"error": "No GitHub account linked."}, status=status.HTTP_400_BAD_REQUEST)

    username = member.github_username
    headers = {"Accept": "application/vnd.github.v3+json"}
    if member.github_token:
        headers["Authorization"] = f"token {member.github_token}"

    commits = []
    repos_set = set()
    issues_count = 0

    try:
        events_url = f"https://api.github.com/users/{username}/events/public"
        events_res = requests.get(events_url, headers=headers, timeout=10)
        if events_res.status_code == 200:
            events = events_res.json()
            for event in events[:30]:
                if event.get("type") == "PushEvent":
                    repo_name = event.get("repo", {}).get("name", "")
                    repos_set.add(repo_name)
                    for c in event.get("payload", {}).get("commits", [])[:5]:
                        commits.append(
                            {
                                "repo": repo_name,
                                "message": c.get("message", ""),
                                "sha": c.get("sha", "")[:7],
                            }
                        )
                elif event.get("type") in ["CreateEvent", "PullRequestEvent", "IssuesEvent"]:
                    repo_name = event.get("repo", {}).get("name", "")
                    repos_set.add(repo_name)

        issues_url = f"https://api.github.com/search/issues?q=author:{username}+type:issue"
        issues_res = requests.get(issues_url, headers=headers, timeout=10)
        if issues_res.status_code == 200:
            issues_count = issues_res.json().get("total_count", 0)

    except requests.RequestException as e:
        return Response({"error": f"GitHub API error: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(
        {
            "username": username,
            "commits": commits[:20],
            "issues_count": issues_count,
            "repos": list(repos_set)[:15],
        },
        status=status.HTTP_200_OK,
    )
