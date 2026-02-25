from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Task, Sprint, Member
from .serializers import TaskSerializer, SprintSerializer, MemberSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all()
        sprint_id = self.request.query_params.get('sprint_id')
        if sprint_id is not None:
            queryset = queryset.filter(sprint_id=sprint_id)
        return queryset

class SprintViewSet(viewsets.ModelViewSet):
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer

# ✅ Member CRUD (Profile uses this)
class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer

# ✅ Auth endpoints (simple demo auth)
@api_view(["POST"])
def register(request):
    data = request.data or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    # allow frontend to omit these; we fill defaults
    first_name = (data.get("first_name") or name or "User").strip()
    last_name = (data.get("last_name") or "").strip()
    username = (data.get("username") or (email.split("@")[0] if "@" in email else email) or email).strip()

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
        username=username,
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
