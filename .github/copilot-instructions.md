I'm willing to update the logos api

# Logos API Documentation

## Overview

The Logos API allows authenticated users to upload, retrieve, and delete logo images. All logo files are stored in the user's personal storage under `/home/<username>/logos/` directory using the existing cloud storage system.

## Features

- ✅ Upload logo images (PNG, JPG, JPEG, GIF, WebP, SVG)
- ✅ File validation and size limits (max 5MB)
- ✅ Retrieve list of user's logos
- ✅ Direct access to logo files via URL
- ✅ Delete specific logos
- ✅ JWT token-based authentication
- ✅ User isolation (users can only access their own logos)

## API Endpoints

### 1. Upload Logo

**POST** `/logos`

Upload a new logo image for the authenticated user.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body:**

- `logo`: Image file (PNG, JPG, JPEG, GIF, WebP, SVG)

**Response (201 Created):**

```json
{
    "success": true,
    "logo_id": 1234567890,
    "filename": "my_logo.png",
    "logo_url": "/logos/user@example.com/uuid-filename.png",
    "file_size": 15234,
    "message": "Logo uploaded successfully"
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `400 Bad Request`: Invalid file type, missing file, or file too large
- `409 Conflict`: File already exists (very unlikely with UUID)
- `500 Internal Server Error`: Server error

### 2. Get User's Logos

**GET** `/logos`

Retrieve all logos uploaded by the authenticated user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
    "success": true,
    "logos": [
        {
            "id": 1234567890,
            "filename": "my_logo.png",
            "logo_url": "/logos/user@example.com/uuid-filename.png",
            "file_size": 15234,
            "content_type": "image/png",
            "created_at": "2025-01-19T10:30:00Z"
        }
    ]
}
```

### 3. Access Logo File

**GET** `/logos/<username>/<filename>`

Directly access a logo file. Returns the actual image data.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

- Returns the raw image data with appropriate `Content-Type` header
- Includes caching headers for performance

### 4. Delete Logo

**DELETE** `/logos?filename=<filename>`

Delete a specific logo belonging to the authenticated user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `filename`: The unique filename of the logo to delete

**Alternative (JSON Body):**

```json
{
    "filename": "uuid-filename.png"
}
```

**Response (200 OK):**

```json
{
    "success": true,
    "message": "Logo deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `400 Bad Request`: Missing filename parameter
- `404 Not Found`: Logo not found or access denied
- `500 Internal Server Error`: Server error

## File Validation

### Supported Formats

- PNG (.png)
- JPEG (.jpg, .jpeg)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### File Size Limit

- Maximum file size: 5MB

### Validation Process

1. **Extension Check**: Validates file extension against allowed formats
2. **Content Validation**: Uses Python's `imghdr` library to verify actual image format
3. **SVG Special Handling**: Basic SVG validation by checking for SVG/XML content
4. **Size Check**: Ensures file doesn't exceed 5MB limit

## Storage Structure

The logos are stored in the cloud storage system under:

```
/home/<username>/logos/<uuid-filename>.<ext>
```

Each file is stored as JSON with metadata:

```json
{
    "metadata": {
        "original_filename": "my_logo.png",
        "unique_filename": "550e8400-e29b-41d4-a716-446655440000.png",
        "file_size": 15234,
        "created_at": "2025-01-19T10:30:00Z",
        "content_type": "image/png",
        "encoding": "base64"
    },
    "content": "<base64_encoded_image_data>"
}
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The JWT token is obtained by logging in through the `/login` endpoint with `react_app=true` parameter.

## Error Handling

All endpoints return consistent error responses:

```json
{
    "error": "Error message description"
}
```

Common HTTP status codes:

- `200`: Success
- `201`: Created (for uploads)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Example Usage

### Python Example

```python
import requests

# Login to get JWT token
login_response = requests.post("http://localhost:8080/login", data={
    'email': 'user@example.com',
    'password': 'password123',
    'react_app': 'true'
})
token = login_response.json()['token']

headers = {'Authorization': f'Bearer {token}'}

# Upload a logo
with open('my_logo.png', 'rb') as f:
    files = {'logo': ('my_logo.png', f, 'image/png')}
    upload_response = requests.post(
        "http://localhost:8080/logos",
        headers=headers,
        files=files
    )

print(upload_response.json())

# Get all logos
logos_response = requests.get("http://localhost:8080/logos", headers=headers)
logos = logos_response.json()['logos']

# Access a logo file
if logos:
    logo_url = logos[0]['logo_url']
    logo_data = requests.get(f"http://localhost:8080{logo_url}", headers=headers)

    # Save the logo
    with open('downloaded_logo.png', 'wb') as f:
        f.write(logo_data.content)

# Delete a logo
if logos:
    filename = logos[0]['logo_url'].split('/')[-1]
    delete_response = requests.delete(
        f"http://localhost:8080/logos?filename={filename}",
        headers=headers
    )
```

### cURL Examples

**Upload Logo:**

```bash
curl -X POST http://localhost:8080/logos \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "logo=@my_logo.png"
```

**Get Logos:**

```bash
curl -X GET http://localhost:8080/logos \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Delete Logo:**

```bash
curl -X DELETE "http://localhost:8080/logos?filename=uuid-filename.png" \
  -H "Authorization: Bearer <your_jwt_token>"
```

## Security Features

1. **User Isolation**: Users can only access their own logos
2. **File Validation**: Strict validation of file types and content
3. **Size Limits**: Prevents abuse with large files
4. **JWT Authentication**: Secure token-based authentication
5. **Unique Filenames**: UUIDs prevent filename conflicts and enhance security

## Notes

- Logo filenames are automatically made unique using UUIDs to prevent conflicts
- Original filenames are preserved in metadata
- Files are base64 encoded for storage in the JSON-based cloud storage system
- Caching headers are set for logo file access to improve performance
- The system integrates seamlessly with the existing Tornado application architecture

this is the documentation
