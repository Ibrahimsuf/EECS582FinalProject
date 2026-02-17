from rest_framework import serializers
from .models import Task, Sprint, Member, Project, Group

# Description: Serializer classes for database models for data conversion
# Programmer(s): Abhriroop Goel, Dylan Kneidel, Ian Lim, Kit Magar, Bryce Martin, Ibrahim Sufi 
# Created: 2026-2-25
# Revised: 2026-2-25

class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'sprint', 'created_at', 'member']

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'

class ProjectsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = '__all__'

