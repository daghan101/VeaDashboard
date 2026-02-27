import { useEffect, useState } from 'react';
import {
    Card, Row, Col, Button, Modal, Form, Input, Select, Switch,
    Typography, message, Tag, Statistic, Space, Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, BankOutlined, LockOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;

interface Account {
    id: string;
    name: string;
    balance: string;
    isRestricted: boolean;
    currency: {
        id: string;
        code: string;
        symbol: string;
    };
}

interface Currency {
    id: string;
    code: string;
    symbol: string;
}

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const [accRes, curRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/currencies'),
            ]);
            setAccounts(accRes.data);
            setCurrencies(curRes.data);
        } catch {
            message.error('Hesaplar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleCreate = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            await api.post('/accounts', values);
            message.success('Hesap oluşturuldu');
            setModalOpen(false);
            form.resetFields();
            fetchAccounts();
        } catch {
            message.error('Hesap oluşturulamadı');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        try {
            await api.delete(`/accounts/${id}`);
            message.success(`${name} hesabı silindi`);
            fetchAccounts();
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Hesap silinemedi (işlem geçmişi olabilir)';
            message.error(errorMsg);
        }
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Hesaplar</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchAccounts}>Yenile</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Yeni Hesap
                    </Button>
                </Space>
            </div>

            <Row gutter={[16, 16]}>
                {accounts.map((account) => {
                    const balance = Number(account.balance);
                    return (
                        <Col xs={24} sm={12} md={8} lg={6} key={account.id}>
                            <Card
                                style={{ borderRadius: 8, height: '100%' }}
                                styles={{ body: { padding: 20 } }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <Space>
                                        <BankOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
                                        <span style={{ fontWeight: 600, fontSize: 15 }}>{account.name}</span>
                                    </Space>
                                    <Space>
                                        {account.isRestricted && (
                                            <Tag icon={<LockOutlined />} color="red">Gizli</Tag>
                                        )}
                                        <Popconfirm
                                            title="Hesabı Sil"
                                            description={`${account.name} hesabını silmek istediğinize emin misiniz?`}
                                            onConfirm={() => handleDelete(account.id, account.name)}
                                            okText="Evet"
                                            cancelText="Hayır"
                                            placement="bottomRight"
                                        >
                                            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                        </Popconfirm>
                                    </Space>
                                </div>
                                <Statistic
                                    value={balance}
                                    precision={2}
                                    prefix={account.currency.symbol}
                                    valueStyle={{
                                        fontSize: 22,
                                        color: balance > 0 ? '#3f8600' : balance < 0 ? '#cf1322' : undefined,
                                    }}
                                />
                                <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                                    {account.currency.code}
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <Modal
                title="Yeni Hesap"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Oluştur"
                cancelText="İptal"
                width={400}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="name" label="Hesap Adı" rules={[{ required: true, message: 'Hesap adı gerekli' }]}>
                        <Input placeholder="Ör: Kasa TL" />
                    </Form.Item>
                    <Form.Item name="currencyId" label="Para Birimi" rules={[{ required: true, message: 'Para birimi seçin' }]}>
                        <Select
                            options={currencies.map((c) => ({
                                value: c.id,
                                label: `${c.code} (${c.symbol})`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="isRestricted" label="Gizli Hesap" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
