import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success('Giriş başarılı!');
            navigate('/', { replace: true });
        } catch {
            message.error('Geçersiz e-posta veya şifre');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Card
                style={{
                    width: 400,
                    borderRadius: 12,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                }}
                bodyStyle={{ padding: '40px 32px' }}
            >
                <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>
                            🥩 Et Toptancısı
                        </Title>
                        <Text type="secondary">Yönetim Paneli</Text>
                    </div>

                    <Form
                        name="login"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                        style={{ textAlign: 'left' }}
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'E-posta gerekli' },
                                { type: 'email', message: 'Geçerli bir e-posta girin' },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="E-posta"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Şifre gerekli' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Şifre"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                style={{
                                    height: 48,
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                }}
                            >
                                Giriş Yap
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </div>
    );
}
