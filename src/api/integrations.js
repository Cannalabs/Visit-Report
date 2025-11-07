// Stub implementations for local development
// Replace these with your own backend API calls

// Core integrations stub
export const Core = {
  InvokeLLM: async (params) => {
    console.warn('InvokeLLM called with:', params);
    return {
      response: 'This is a mock LLM response. Replace with your own implementation.',
      usage: { tokens: 0 }
    };
  },
  SendEmail: async (params) => {
    console.warn('SendEmail called with:', params);
    return {
      success: true,
      messageId: `email_${Date.now()}`
    };
  },
  UploadFile: async (file, options = {}) => {
    console.warn('UploadFile called with:', file, options);
    // Return a mock file URL
    return {
      url: `https://example.com/files/${file?.name || 'file'}`,
      fileId: `file_${Date.now()}`
    };
  },
  GenerateImage: async (params) => {
    console.warn('GenerateImage called with:', params);
    return {
      url: 'https://example.com/generated-image.png',
      imageId: `image_${Date.now()}`
    };
  },
  ExtractDataFromUploadedFile: async (fileId, options = {}) => {
    console.warn('ExtractDataFromUploadedFile called with:', fileId, options);
    return {
      extractedData: {},
      success: true
    };
  },
  CreateFileSignedUrl: async (fileId, options = {}) => {
    console.warn('CreateFileSignedUrl called with:', fileId, options);
    return {
      signedUrl: `https://example.com/signed/${fileId}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
  },
  UploadPrivateFile: async (file, options = {}) => {
    console.warn('UploadPrivateFile called with:', file, options);
    return {
      url: `https://example.com/private/files/${file?.name || 'file'}`,
      fileId: `private_file_${Date.now()}`
    };
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
