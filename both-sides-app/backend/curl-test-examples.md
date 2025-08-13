# Profile API Testing with cURL

## Prerequisites
- Server running on `http://localhost:3000`
- Valid JWT token from Clerk (replace `YOUR_JWT_TOKEN` below)

## Test Commands

### 1. Check if current user has completed profile
```bash
curl -X GET "http://localhost:3000/profiles/me/completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Get current user profile
```bash
curl -X GET "http://localhost:3000/profiles/me/current" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Create profile for current user
```bash
curl -X POST "http://localhost:3000/profiles/me/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "survey_responses": {
      "questions": [
        "What is your stance on economic policy?",
        "How do you view social issues?",
        "What are your thoughts on environmental policy?"
      ],
      "answers": [
        "I believe in mixed economy approaches",
        "I support progressive social policies",
        "Climate change is a serious concern"
      ]
    },
    "belief_summary": "I am a progressive individual who believes in evidence-based policy making and social justice while supporting reasonable economic policies that promote both growth and equality.",
    "ideology_scores": {
      "liberal": 0.7,
      "conservative": 0.3,
      "progressive": 0.8,
      "libertarian": 0.4
    },
    "opinion_plasticity": 0.6
  }'
```

### 4. Update current user profile
```bash
curl -X PUT "http://localhost:3000/profiles/me/update" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "belief_summary": "Updated belief summary with more nuanced views on policy making and social justice.",
    "opinion_plasticity": 0.7
  }'
```

### 5. Mark profile as completed
```bash
curl -X PUT "http://localhost:3000/profiles/me/complete" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. Get profile insights
```bash
curl -X GET "http://localhost:3000/profiles/me/insights" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 7. Get profile statistics (admin)
```bash
curl -X GET "http://localhost:3000/profiles/stats/summary" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 8. List all profiles (admin, paginated)
```bash
curl -X GET "http://localhost:3000/profiles?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 9. Search profiles (admin)
```bash
curl -X GET "http://localhost:3000/profiles?search=progressive&completed=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 10. Create profile with direct user_id (admin)
```bash
curl -X POST "http://localhost:3000/profiles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_UUID_HERE",
    "survey_responses": {
      "questions": ["Sample question"],
      "answers": ["Sample answer"]
    },
    "belief_summary": "Sample belief summary for testing purposes.",
    "ideology_scores": {
      "liberal": 0.6,
      "conservative": 0.4
    }
  }'
```

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Profile created successfully",
  "data": {
    "id": "profile-uuid",
    "is_completed": true,
    "survey_responses": { ... },
    "belief_summary": "...",
    "ideology_scores": { ... },
    "opinion_plasticity": 0.6,
    "profile_version": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "username": "johndoe",
      "role": "STUDENT"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "data": null
}
```

### Profile Insights Response
```json
{
  "success": true,
  "data": {
    "completion_percentage": 100,
    "missing_fields": [],
    "ideology_summary": "Primarily liberal (70%)",
    "plasticity_interpretation": "Moderately flexible - open to different perspectives",
    "recommendations": [
      "Update your profile periodically to reflect evolving beliefs"
    ]
  }
}
```

## Testing Tips

1. **Get a real JWT token**: Use the frontend auth flow or create a test token
2. **Check server logs**: Monitor the NestJS console for detailed error messages
3. **Validate data**: Try sending invalid data to test validation rules
4. **Test permissions**: Try accessing admin endpoints with different user roles
5. **Test edge cases**: Empty data, malformed JSON, missing headers, etc.

## Troubleshooting

### Common Issues:
- **401 Unauthorized**: Invalid or missing JWT token
- **400 Bad Request**: Validation errors in request body
- **404 Not Found**: Profile doesn't exist
- **409 Conflict**: Profile already exists for user
- **500 Internal Server Error**: Check server logs for details
