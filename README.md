# EECS582FinalProject

admin user is 
admin@gmail.com 
Password: 1234

## Backend API insturctions  for timeline and creating tasks

example curl command to create a new task
curl -X POST http://127.0.0.1:8000/api/tasks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix login bug",
    "description": "Users cannot log in with email",
    "status": "TODO",
    "sprint": 8,
    "member_ids": [1]
  }'


example curl command to view timeline
curl http://127.0.0.1:8000/api/projects/1/timeline/
