import { Card, Descriptions, Tag } from 'antd';
import { useModel } from '@umijs/max';
import React from 'react';

const UserInfo: React.FC = () => {
    const { initialState } = useModel('@@initialState');
    const { currentUser } = initialState || {};

    return (
        <div style={{ padding: 24 }}>
            <Card title="🔍 当前用户信息检查" bordered>
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="用户名">
                        {currentUser?.name || '未获取到'}
                    </Descriptions.Item>
                    <Descriptions.Item label="用户ID">
                        {currentUser?.userid || '未获取到'}
                    </Descriptions.Item>
                    <Descriptions.Item label="邮箱">
                        {currentUser?.email || '未获取到'}
                    </Descriptions.Item>
                    <Descriptions.Item label="权限级别 (access)">
                        <Tag color={currentUser?.access === 'admin' ? 'green' : 'orange'}>
                            {currentUser?.access || '未获取到'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="职位">
                        {currentUser?.title || '未获取到'}
                    </Descriptions.Item>
                    <Descriptions.Item label="部门">
                        {currentUser?.group || '未获取到'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
};

export default UserInfo;
