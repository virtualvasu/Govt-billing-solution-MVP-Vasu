# CORS Error Troubleshooting Guide

## Understanding the Error

The CORS error you're seeing means:
- **Frontend**: Running on `http://localhost:5173` (Vite dev server)
- **Backend**: Running on `http://localhost:8080` (Your Tornado server)
- **Problem**: Browser blocks cross-origin requests without proper CORS headers

## Solutions (Choose One)

### ✅ Solution 1: Fix Server CORS (Recommended)

Add CORS headers to your Tornado server. In your Python server code:

```python
import tornado.web
from tornado.web import RequestHandler

class BaseHandler(RequestHandler):
    def set_default_headers(self):
        # Allow requests from your Vite dev server
        self.set_header("Access-Control-Allow-Origin", "http://localhost:5173")
        self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.set_header("Access-Control-Allow-Credentials", "true")

    def options(self, *args):
        # Handle preflight requests
        self.set_status(204)
        self.finish()

# Update your handlers to inherit from BaseHandler
class UserLoginHandler(BaseHandler):
    # ... your existing code

class UserRegisterHandler(BaseHandler):  
    # ... your existing code

class UserLogoutHandler(BaseHandler):
    # ... your existing code
```

### ✅ Solution 2: Use Vite Proxy (Already Configured)

I've already set up a proxy in your `vite.config.ts`. This should work if your server is running on port 8080.

**To test the proxy:**
1. Make sure your server is running on `http://localhost:8080`
2. The frontend will proxy `/api/*` requests to your server
3. Try logging in - it should now work without CORS errors

### ✅ Solution 3: Quick Development Fix

For immediate testing, temporarily allow all origins (⚠️ **DEVELOPMENT ONLY**):

```python
def set_default_headers(self):
    self.set_header("Access-Control-Allow-Origin", "*")
    self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization") 
    self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
```

## Testing Steps

1. **Check server is running**: Visit `http://localhost:8080/login` in browser
2. **Test with proxy**: Login should work via frontend at `http://localhost:5173`
3. **Check network tab**: Look for requests to `/api/login` instead of full URL

## Debug Commands

```bash
# Check if server is running
curl -X POST http://localhost:8080/login -d "email=test&password=test"

# Check proxy is working  
curl -X POST http://localhost:5173/api/login -d "email=test&password=test"
```

## Expected Behavior

✅ **With CORS Fixed**: Direct requests to `localhost:8080` work  
✅ **With Proxy**: Requests to `/api/login` work  
❌ **Without Fix**: CORS error blocks requests

Choose the solution that best fits your setup!
