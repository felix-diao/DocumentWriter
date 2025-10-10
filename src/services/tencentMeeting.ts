import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface TencentMeetingConfig {
    appId: string;
    sdkId: string;
    secretId: string;
    secretKey: string;
    apiUrl?: string;
}

interface CreateMeetingParams {
    subject: string;
    type: number; // 0:预约会议 1:快速会议
    start_time?: string; // Unix 时间戳
    end_time?: string;
    settings?: {
        mute_enable_join?: boolean;
        allow_unmute_self?: boolean;
        auto_record_type?: string;
    };
    meeting_type?: number;
}

interface MeetingInfo {
    meeting_id: string;
    meeting_code: string;
    subject: string;
    join_url: string;
    start_time?: string;
    end_time?: string;
    status?: string;
}

class TencentMeetingService {
    private config: TencentMeetingConfig;
    private apiUrl: string;
    private axiosInstance: AxiosInstance;

    constructor(config: TencentMeetingConfig) {
        this.config = config;
        this.apiUrl = config.apiUrl || 'https://api.meeting.qq.com/v1';

        this.axiosInstance = axios.create({
            baseURL: this.apiUrl,
            timeout: 10000,
        });

        // 添加请求拦截器，自动添加签名
        this.axiosInstance.interceptors.request.use((config) => {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = this.generateNonce();

            config.headers = config.headers || {};
            config.headers['X-TC-Key'] = this.config.secretId;
            config.headers['X-TC-Timestamp'] = timestamp;
            config.headers['X-TC-Nonce'] = nonce;
            config.headers['X-TC-Signature'] = this.generateSignature(
                config.method?.toUpperCase() || 'GET',
                config.url || '',
                timestamp,
                nonce,
                JSON.stringify(config.data || {})
            );
            config.headers['AppId'] = this.config.appId;
            config.headers['SdkId'] = this.config.sdkId;

            return config;
        });
    }

    /**
     * 创建会议
     */
    async createMeeting(params: CreateMeetingParams): Promise<MeetingInfo> {
        try {
            const response = await this.axiosInstance.post('/meetings', {
                userid: this.config.sdkId, // 用户 ID，企业内唯一
                instanceid: 1, // 设备类型，1:PC 2:Mac 3:Android 4:iOS
                ...params,
            });

            return {
                meeting_id: response.data.meeting_info[0].meeting_id,
                meeting_code: response.data.meeting_info[0].meeting_code,
                subject: response.data.meeting_info[0].subject,
                join_url: response.data.meeting_info[0].join_url,
                start_time: response.data.meeting_info[0].start_time,
                end_time: response.data.meeting_info[0].end_time,
            };
        } catch (error: any) {
            console.error('创建会议失败:', error.response?.data || error.message);
            throw new Error(this.handleError(error));
        }
    }

    /**
     * 查询会议详情
     */
    async getMeetingInfo(meetingId: string): Promise<MeetingInfo> {
        try {
            const response = await this.axiosInstance.get(`/meetings/${meetingId}`, {
                params: {
                    userid: this.config.sdkId,
                    instanceid: 1,
                },
            });

            const data = response.data.meeting_info_list[0];
            return {
                meeting_id: data.meeting_id,
                meeting_code: data.meeting_code,
                subject: data.subject,
                join_url: data.join_url,
                start_time: data.start_time,
                end_time: data.end_time,
                status: data.status,
            };
        } catch (error: any) {
            console.error('查询会议失败:', error.response?.data || error.message);
            throw new Error(this.handleError(error));
        }
    }

    /**
     * 取消会议
     */
    async cancelMeeting(meetingId: string, reason?: string): Promise<void> {
        try {
            await this.axiosInstance.post(`/meetings/${meetingId}/cancel`, {
                userid: this.config.sdkId,
                instanceid: 1,
                reason_code: 1, // 取消原因代码
                reason_detail: reason || '主动取消',
            });
        } catch (error: any) {
            console.error('取消会议失败:', error.response?.data || error.message);
            throw new Error(this.handleError(error));
        }
    }

    /**
     * 修改会议
     */
    async updateMeeting(meetingId: string, params: Partial<CreateMeetingParams>): Promise<void> {
        try {
            await this.axiosInstance.put(`/meetings/${meetingId}`, {
                userid: this.config.sdkId,
                instanceid: 1,
                ...params,
            });
        } catch (error: any) {
            console.error('修改会议失败:', error.response?.data || error.message);
            throw new Error(this.handleError(error));
        }
    }

    /**
     * 查询用户的会议列表
     */
    async getUserMeetings(startTime?: string, endTime?: string): Promise<MeetingInfo[]> {
        try {
            const response = await this.axiosInstance.get('/meetings', {
                params: {
                    userid: this.config.sdkId,
                    instanceid: 1,
                    start_time: startTime,
                    end_time: endTime,
                },
            });

            return response.data.meeting_info_list.map((item: any) => ({
                meeting_id: item.meeting_id,
                meeting_code: item.meeting_code,
                subject: item.subject,
                join_url: item.join_url,
                start_time: item.start_time,
                end_time: item.end_time,
                status: item.status,
            }));
        } catch (error: any) {
            console.error('查询会议列表失败:', error.response?.data || error.message);
            throw new Error(this.handleError(error));
        }
    }

    /**
     * 获取参会成员列表
     */
    async getParticipants(meetingId: string): Promise<any[]> {
        try {
            const response = await this.axiosInstance.get(`/meetings/${meetingId}/participants`, {
                params: {
                    userid: this.config.sdkId,
                },
            });

            return response.data.participants || [];
        } catch (error: any) {
            console.error('获取参会成员失败:', error.response?.data || error.message);
            throw new Error(this.handleError(error));
        }
    }

    /**
     * 生成签名
     */
    private generateSignature(
        method: string,
        uri: string,
        timestamp: string,
        nonce: string,
        body: string
    ): string {
        const headerString = [
            `X-TC-Key=${this.config.secretId}`,
            `X-TC-Nonce=${nonce}`,
            `X-TC-Timestamp=${timestamp}`,
        ]
            .sort()
            .join('&');

        const stringToSign = [
            method,
            headerString,
            uri,
            body,
        ].join('\n');

        return crypto
            .createHmac('sha256', this.config.secretKey)
            .update(stringToSign)
            .digest('hex');
    }

    /**
     * 生成随机数
     */
    private generateNonce(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    /**
     * 错误处理
     */
    private handleError(error: any): string {
        if (error.response?.data) {
            const errorCode = error.response.data.error_code;
            const errorMsg = error.response.data.error_msg;
            return `${errorMsg} (${errorCode})`;
        }
        return '会议服务暂时不可用，请稍后重试';
    }
}

// 导出单例
export const tencentMeetingService = new TencentMeetingService({
    appId: process.env.TENCENT_MEETING_APP_ID || '',
    sdkId: process.env.TENCENT_MEETING_SDK_ID || '',
    secretId: process.env.TENCENT_MEETING_SECRET_ID || '',
    secretKey: process.env.TENCENT_MEETING_SECRET_KEY || '',
});

export default TencentMeetingService;