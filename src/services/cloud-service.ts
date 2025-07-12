import { Capacitor } from "@capacitor/core";

// Function to get the appropriate API base URL based on platform
const getApiBaseUrl = (): string => {
  // Check if we have an environment variable set
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // For Capacitor native apps, we need to use the computer's IP address
  if (Capacitor.isNativePlatform()) {
    // TODO: Replace with your actual computer's IP address
    // You can find your IP with: ifconfig (Linux/Mac) or ipconfig (Windows)
    return "http://192.168.110.61:8888"; // Replace with your actual IP
  }

  // For web development, use localhost
  return "http://localhost:8888";
};

const API_BASE_URL = getApiBaseUrl();

export interface ServerFile {
  id: number;
  filename: string;
  s3_key: string;
  created_at: string;
  file_size: number;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface Logo {
  id: number;
  filename: string;
  s3_key: string;
  logo_url: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface LogoResponse {
  success: boolean;
  logos: Logo[];
}

export interface UploadLogoResponse {
  success: boolean;
  logo_id: number;
  filename: string;
  logo_url: string;
  file_size: number;
  message: string;
}

export interface PDFGenerationRequest {
  html_content?: string;
  url?: string;
  filename?: string;
  options?: {
    "page-size"?: string;
    "margin-top"?: string;
    "margin-right"?: string;
    "margin-bottom"?: string;
    "margin-left"?: string;
    orientation?: string;
    [key: string]: any;
  };
  user_id: string;
}

export interface PDFGenerationResponse {
  success: boolean;
  file_id: number;
  filename: string;
  s3_key: string;
  source_type: string;
  size: number;
  message: string;
}

export interface UserPDF {
  id: number;
  filename: string;
  created_at: string;
  source_type: string;
  original_url?: string;
}

export interface PDFListResponse {
  success: boolean;
  count: number;
  pdfs: UserPDF[];
}

class CloudService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("server_auth_token", token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem("server_auth_token");
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("server_auth_token");
    localStorage.removeItem("user_info"); // Clear user info as well
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    this.setToken(data.token);

    // Store user info for later use
    if (data.user) {
      localStorage.setItem("user_info", JSON.stringify(data.user));
    }

    return data;
  }

  async register(
    credentials: RegisterCredentials
  ): Promise<{ success: boolean; message: string; user_id: number }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    return await response.json();
  }

  async getFiles(): Promise<ServerFile[]> {
    const response = await fetch(`${API_BASE_URL}/server-files`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch files");
    }

    const data = await response.json();
    return data.files;
  }

  async uploadFile(file: File): Promise<{
    success: boolean;
    message: string;
    file_id: number;
    filename: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/server-files/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    return await response.json();
  }

  async uploadInvoiceData(
    filename: string,
    content: string,
    billType: number
  ): Promise<{
    success: boolean;
    message: string;
    file_id: number;
    filename: string;
  }> {
    // Create a JSON file with the invoice data
    const fileData = {
      fileName: `server_${filename}`,
      content: content,
      timestamp: new Date().toISOString(),
      billType: billType,
    };

    // Create a Blob from the JSON data
    const jsonBlob = new Blob([JSON.stringify(fileData, null, 2)], {
      type: "application/json",
    });

    // Create a File object from the Blob
    const file = new File([jsonBlob], `server_${filename}.json`, {
      type: "application/json",
    });

    // Use the existing uploadFile method
    return await this.uploadFile(file);
  }

  async downloadFile(fileId: number): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/server-files/download/${fileId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      if (response.status === 404) {
        throw new Error("File not found");
      }
      const error = await response.json();
      throw new Error(error.error || "Download failed");
    }

    return await response.blob();
  }

  async deleteFile(
    fileId: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/server-files/delete/${fileId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      if (response.status === 404) {
        throw new Error("File not found");
      }
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }

    return await response.json();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Logo management methods
  async getLogos(): Promise<Logo[]> {
    const response = await fetch(`${API_BASE_URL}/logos/`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch logos");
    }

    const data = await response.json();
    return data.logos;
  }

  async uploadLogo(logoFile: File): Promise<UploadLogoResponse> {
    const formData = new FormData();
    formData.append("logo", logoFile);

    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/logos/`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "Logo upload failed");
    }

    return await response.json();
  }

  async deleteLogo(
    logoId: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/logos/${logoId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      if (response.status === 404) {
        throw new Error("Logo not found");
      }
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }

    return await response.json();
  }

  async getLogoDetails(logoId: number): Promise<Logo> {
    const response = await fetch(`${API_BASE_URL}/logos/${logoId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      if (response.status === 404) {
        throw new Error("Logo not found");
      }
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch logo details");
    }

    const data = await response.json();
    return data.logo;
  }

  async convertUrlToBase64(imageUrl: string): Promise<{
    success: boolean;
    base64: string;
    data_url: string;
    content_type: string;
    file_size: number;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/logos/url-to-base64`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }

      // Handle specific error cases from the API
      const error = await response.json().catch(() => ({}));

      if (response.status === 400) {
        // Check if it's a CORS-related error or other client errors
        if (error.error && error.error.includes("CORS")) {
          const corsError = new Error("CORS_ERROR");
          corsError.message = "CORS_ERROR";
          throw corsError;
        }
        throw new Error(error.error || "Invalid request");
      }

      if (response.status === 408) {
        throw new Error("Request timeout. URL took too long to respond");
      }

      throw new Error(error.error || "Failed to convert URL to base64");
    }

    return await response.json();
  }

  /**
   * Convert HTML to PDF using the new direct API endpoint
   * Returns PDF blob directly without S3 storage
   */
  async convertHTMLToPDF(
    htmlContent: string,
    options: {
      filename?: string;
      pdfOptions?: PDFGenerationRequest["options"];
    }
  ): Promise<Blob> {
    const requestData = {
      html_content: htmlContent,
      filename: options.filename || "document.pdf",
      options: options.pdfOptions || {},
    };

    const response = await fetch(`${API_BASE_URL}/pdf/convert`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "PDF conversion failed");
    }

    return await response.blob();
  }

  /**
   * Preview PDF using the new direct API endpoint
   * Returns PDF blob for inline preview
   */
  async previewPDFDirect(
    htmlContent: string,
    options?: PDFGenerationRequest["options"]
  ): Promise<Blob> {
    const requestData = {
      html_content: htmlContent,
      options: options || {},
    };

    const response = await fetch(`${API_BASE_URL}/pdf/preview`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "PDF preview generation failed");
    }

    return await response.blob();
  }

  /**
   * Check the health of the HTML to PDF service
   */
  async checkPDFServiceHealth(): Promise<{
    status: string;
    service: string;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/pdf/health`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Authentication required");
      }
      const error = await response.json();
      throw new Error(error.error || "PDF service health check failed");
    }

    return await response.json();
  }

  // Helper method to get user ID (you may need to adjust this based on your auth implementation)
  getCurrentUserId(): string | null {
    // This is a placeholder - you'll need to implement this based on how you store user info
    // You might get this from the JWT token or store it separately after login
    const userInfo = localStorage.getItem("user_info");
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        return parsed.id?.toString() || parsed.user?.id?.toString();
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
    return null;
  }
}

export const cloudService = new CloudService();
