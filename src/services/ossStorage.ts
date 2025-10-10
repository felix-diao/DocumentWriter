// services/ossStorageMock.ts
import axios from 'axios';

interface UploadOptions {
    folder?: string;
    filename?: string;
    onProgress?: (percent: number) => void;
}

interface FileInfo {
    name: string;
    url: string;
    size: number;
    type: string;
    uploadTime: string | Date;
}

export const ossStorageService = {
    /**
     * 上传单个文件（Mock）
     */
    uploadFile: async (file: File, options: UploadOptions = {}): Promise<FileInfo> => {
        const formData = new FormData();
        formData.append('filename', options.filename || file.name);
        formData.append('folder', options.folder || 'documents');
        formData.append('size', file.size.toString());
        formData.append('type', file.type);

        const response = await axios.post('/api/storage/upload', formData, {
            onUploadProgress: (progressEvent) => {
                if (options.onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    options.onProgress(percent);
                }
            },
        });

        // 确保返回对象和 OSSStorageService 一致
        return {
            name: response.data.data.name,
            url: response.data.data.url,
            size: response.data.data.size,
            type: response.data.data.type,
            uploadTime: new Date(response.data.data.uploadTime),
        };
    },

    /**
     * 上传多个文件（Mock）
     */
    uploadMultipleFiles: async (files: File[], options: UploadOptions = {}): Promise<FileInfo[]> => {
        const results: FileInfo[] = [];
        for (const file of files) {
            try {
                const res = await ossStorageService.uploadFile(file, options);
                results.push(res);
            } catch (error) {
                console.error(`上传文件 ${file.name} 失败`, error);
            }
        }
        return results;
    },

    /**
     * 获取文件临时访问 URL
     */
    getSignedUrl: async (objectName: string, expires: number = 3600): Promise<string> => {
        const response = await axios.get(`/api/storage/file/${objectName}/url`);
        return response.data.data.url;
    },

    /**
     * 删除文件
     */
    deleteFile: async (objectName: string): Promise<void> => {
        await axios.delete(`/api/storage/file/${objectName}`);
    },

    /**
     * 列出文件
     */
    listFiles: async (folder?: string): Promise<FileInfo[]> => {
        const response = await axios.get('/api/storage/files', { params: { folder } });
        return response.data.data.files.map((f: any) => ({
            name: f.name,
            url: f.url,
            size: f.size,
            type: f.type,
            uploadTime: new Date(f.uploadTime),
        }));
    },
};

export default ossStorageService;
