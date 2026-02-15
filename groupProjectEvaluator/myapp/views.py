from rest_framework import viewsets
from .models import Task, Sprint
from .serializers import TaskSerializer, SprintSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_queryset(self):
        """
        Optional: Allow filtering by sprint via URL.
        Example: /api/tasks/?sprint_id=1
        """
        queryset = Task.objects.all()
        sprint_id = self.request.query_params.get('sprint_id')
        if sprint_id is not None:
            queryset = queryset.filter(sprint_id=sprint_id)
        return queryset

class SprintViewSet(viewsets.ModelViewSet):
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer
