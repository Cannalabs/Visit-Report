// Stub implementations for local development
// Replace these with your own backend API calls

// Core integrations stub
export const Core = {
  InvokeLLM: async (params) => {
    return {
      response: 'This is a mock LLM response. Replace with your own implementation.',
      usage: { tokens: 0 }
    };
  },
  SendEmail: async (params) => {
    return {
      success: true,
      messageId: `email_${Date.now()}`
    };
  },
  UploadFile: async (file, options = {}) => {
    // Try to use backend API first, fallback to data URL if backend is not available
    try {
      const { getApiBaseUrl } = await import('./config');
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('access_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Get API base URL dynamically (includes /api)
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/files/upload`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          url: result.url || result.file_url,
          fileId: result.fileId,
          file_url: result.file_url || result.url
        };
      }
    } catch (error) {
      // Backend upload failed, using data URL fallback
    }
    
    // Fallback to data URL if backend upload fails
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target.result, // Data URL
          fileId: `file_${Date.now()}`,
          file_url: e.target.result // Also provide file_url for compatibility
        });
      };
      reader.onerror = () => {
        // Fallback to a placeholder data URL if read fails
        resolve({
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          fileId: `file_${Date.now()}`,
          file_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });
      };
      reader.readAsDataURL(file);
    });
  },
  GenerateImage: async (params) => {
    // Return a placeholder data URL instead of example.com
    return {
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      imageId: `image_${Date.now()}`
    };
  },
  ExtractDataFromUploadedFile: async (fileId, options = {}) => {
    return {
      extractedData: {},
      success: true
    };
  },
  CreateFileSignedUrl: async (fileId, options = {}) => {
    // Return a data URL instead of example.com
    return {
      signedUrl: `data:application/octet-stream;base64,`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
  },
  UploadPrivateFile: async (file, options = {}) => {
    // Return a data URL instead of example.com
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target.result,
          fileId: `private_file_${Date.now()}`,
          file_url: e.target.result
        });
      };
      reader.onerror = () => {
        resolve({
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          fileId: `private_file_${Date.now()}`,
          file_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });
      };
      reader.readAsDataURL(file);
    });
  }
};

// Individual export stubs for convenience
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;
