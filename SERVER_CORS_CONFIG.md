# Server CORS Configuration Guide

## For Python Tornado Server

Add this to your server configuration:

```python
import tornado.web
from tornado.web import RequestHandler

class BaseHandler(RequestHandler):
    def set_default_headers(self):
        # Allow requests from your frontend (adjust port as needed)
        self.set_header("Access-Control-Allow-Origin", "http://localhost:5173")
        self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.set_header("Access-Control-Allow-Credentials", "true")

    def options(self, *args):
        # Handle preflight requests
        self.set_status(204)
        self.finish()

# Make sure all your handlers inherit from BaseHandler
class UserLoginHandler(BaseHandler):
    # ... your existing code
    
class UserRegisterHandler(BaseHandler):
    # ... your existing code
    
class UserLogoutHandler(BaseHandler):
    # ... your existing code
```

## Alternative: For Express.js Server

If you're using Node.js with Express:

```javascript
const cors = require('cors');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
```

## For Development Only: Allow All Origins

```python
# WARNING: Only use this in development!
def set_default_headers(self):
    self.set_header("Access-Control-Allow-Origin", "*")
    self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
```
