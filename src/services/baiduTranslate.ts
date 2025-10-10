import axios from 'axios';
import md5 from 'md5';

interface BaiduTranslateConfig {
    appid: string;
    secretKey: string;
    apiUrl?: string;
}

interface TranslateParams {
    text: string;
    from: string;
    to: string;
}

interface BaiduTranslateResponse {
    trans_result: Array<{
        src: string;
        dst: string;
    }>;
    from: string;
    to: string;
}

class BaiduTranslateService {
    private config: BaiduTranslateConfig;
    private apiUrl: string;

    constructor(config: BaiduTranslateConfig) {
        this.config = config;
        this.apiUrl = config.apiUrl || 'https://fanyi-api.baidu.com/api/trans/vip/translate';
    }

    /**
     * 生成签名
     * sign = MD5(appid+query+salt+密钥)
     */
    private generateSign(query: string, salt: string): string {
        const { appid, secretKey } = this.config;
        const str = `${appid}${query}${salt}${secretKey}`;
        return md5(str);
    }

    /**
     * 翻译文本
     */
    async translate(params: TranslateParams): Promise<string> {
        const { text, from, to } = params;
        const salt = Date.now().toString();
        const sign = this.generateSign(text, salt);

        try {
            const response = await axios.get<BaiduTranslateResponse>(this.apiUrl, {
                params: {
                    q: text,
                    from: this.convertLangCode(from),
                    to: this.convertLangCode(to),
                    appid: this.config.appid,
                    salt,
                    sign,
                },
                timeout: 10000,
            });

            if (response.data.trans_result && response.data.trans_result.length > 0) {
                return response.data.trans_result.map(item => item.dst).join('\n');
            }

            throw new Error('翻译失败：未返回结果');
        } catch (error: any) {
            console.error('百度翻译 API 错误:', error);

            // 处理常见错误
            if (error.response?.data) {
                const errorCode = error.response.data.error_code;
                const errorMsg = this.getErrorMessage(errorCode);
                throw new Error(errorMsg);
            }

            throw new Error('翻译服务暂时不可用，请稍后重试');
        }
    }

    /**
     * 批量翻译
     */
    async batchTranslate(texts: string[], from: string, to: string): Promise<string[]> {
        const results: string[] = [];

        // 避免并发过多，分批处理
        const batchSize = 5;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const promises = batch.map(text =>
                this.translate({ text, from, to })
                    .catch(error => {
                        console.error(`翻译失败: ${text}`, error);
                        return text; // 失败时返回原文
                    })
            );
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);

            // 添加延迟，避免超过 API 频率限制
            if (i + batchSize < texts.length) {
                await this.delay(1000);
            }
        }

        return results;
    }

    /**
     * 转换语言代码
     * 将前端使用的语言代码转换为百度 API 的代码
     */
    private convertLangCode(langCode: string): string {
        const langMap: Record<string, string> = {
            'zh-CN': 'zh',
            'en-US': 'en',
            'ja-JP': 'jp',
            'ko-KR': 'kor',
            'fr-FR': 'fra',
            'de-DE': 'de',
            'es-ES': 'spa',
            'ru-RU': 'ru',
        };
        return langMap[langCode] || langCode;
    }

    /**
     * 获取错误信息
     */
    private getErrorMessage(errorCode: string): string {
        const errorMap: Record<string, string> = {
            '52000': '成功',
            '52001': '请求超时，请重试',
            '52002': '系统错误，请重试',
            '52003': '未授权用户，请检查 appid 和密钥',
            '54000': '必填参数为空',
            '54001': '签名错误',
            '54003': '访问频率受限',
            '54004': '账户余额不足',
            '54005': '长query请求频繁',
            '58000': '客户端IP非法',
            '58001': '译文语言方向不支持',
        };
        return errorMap[errorCode] || `翻译错误 (${errorCode})`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出单例
export const baiduTranslateService = new BaiduTranslateService({
    appid: process.env.BAIDU_TRANSLATE_APPID || '',
    secretKey: process.env.BAIDU_TRANSLATE_SECRET || '',
});

export default BaiduTranslateService;