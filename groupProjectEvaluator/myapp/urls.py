from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SprintViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'sprints', SprintViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
