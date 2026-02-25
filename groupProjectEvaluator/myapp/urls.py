from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SprintViewSet, MemberViewSet, register, login

router = DefaultRouter()
router.register(r"tasks", TaskViewSet)
router.register(r"sprints", SprintViewSet)
router.register(r"members", MemberViewSet)

urlpatterns = [
    path("auth/register/", register),
    path("auth/login/", login),
    path("", include(router.urls)),
]
