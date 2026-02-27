import { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, InputNumber, Select, Space,
    Typography, message, Tag, Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title } = Typography;

interface Transaction {
    id: string;
    amount: string;
    type: string;
    description: string | null;
    referenceType: string | null;
    isConfirmed: boolean;
    maturityDate: string | null;
    createdAt: string;
    account: {
        id: string;
        name: string;
        currency: { symbol: string };
    };
    user: {
        id: string;
        name: string;
    };
}

interface Account {
    id: string;
    name: string;
    currency: { symbol: string };
}

const typeLabels: Record<string, string> = {
    COLLECTION: 'Tahsilat',
    PAYMENT: 'Ödeme',
    EXPENSE: 'Gider',
    TRANSFER: 'Transfer',
};

const typeColors: Record<string, string> = {
    COLLECTION: 'green',
    PAYMENT: 'red',
    EXPENSE: 'orange',
    TRANSFER: 'blue',
};

export default function TransactionsPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // Filters
    const [filterAccount, setFilterAccount] = useState<string | undefined>(undefined);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);
    const [filterConfirmed, setFilterConfirmed] = useState<string | undefined>(undefined);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filterAccount) params.accountId = filterAccount;
            if (filterType) params.type = filterType;
            if (filterConfirmed) params.confirmed = filterConfirmed;

            const [txRes, accRes] = await Promise.all([
                api.get('/transactions', { params }),
                api.get('/accounts'),
            ]);
            setTransactions(txRes.data);
            setAccounts(accRes.data);
        } catch {
            message.error('İşlemler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterAccount, filterType, filterConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreate = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            await api.post('/transactions', { ...values, userId: user?.id });
            message.success('İşlem oluşturuldu');
            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch {
            message.error('İşlem oluşturulamadı');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirm = async (id: string) => {
        try {
            await api.patch(`/transactions/${id}/confirm`);
            message.success('İşlem onaylandı');
            fetchData();
        } catch {
            message.error('Onaylama başarısız');
        }
    };

    const columns: ColumnsType<Transaction> = [
        {
            title: 'Tarih',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
        },
        {
            title: 'Hesap',
            dataIndex: ['account', 'name'],
            key: 'account',
            width: 140,
        },
        {
            title: 'Tip',
            dataIndex: 'type',
            key: 'type',
            width: 110,
            render: (type: string) => (
                <Tag color={typeColors[type]}>{typeLabels[type] || type}</Tag>
            ),
        },
        {
            title: 'Tutar',
            dataIndex: 'amount',
            key: 'amount',
            width: 140,
            align: 'right',
            render: (val: string, record: Transaction) => {
                const num = Number(val);
                const isExpense = record.type === 'PAYMENT' || record.type === 'EXPENSE';
                return (
                    <span style={{ color: isExpense ? '#cf1322' : '#3f8600', fontWeight: 600 }}>
                        {isExpense ? '-' : '+'}{record.account.currency.symbol}{num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                );
            },
        },
        {
            title: 'Açıklama',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (val: string | null) => val || '—',
        },
        {
            title: 'Kaynak',
            dataIndex: 'referenceType',
            key: 'referenceType',
            width: 100,
            render: (val: string | null) => val || 'Manuel',
        },
        {
            title: 'Onay',
            dataIndex: 'isConfirmed',
            key: 'isConfirmed',
            width: 100,
            render: (confirmed: boolean) => (
                confirmed
                    ? <Tag color="green" icon={<CheckCircleOutlined />}>Onaylı</Tag>
                    : <Tag color="default">Bekliyor</Tag>
            ),
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 90,
            render: (_, record) => (
                !record.isConfirmed ? (
                    <Popconfirm
                        title="Bu işlemi onaylamak istediğinize emin misiniz?"
                        onConfirm={() => handleConfirm(record.id)}
                        okText="Evet"
                        cancelText="Hayır"
                    >
                        <Button type="link" size="small">Onayla</Button>
                    </Popconfirm>
                ) : null
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Finansal İşlemler</Title>
                <Space>
                    <Select
                        placeholder="Hesap"
                        allowClear
                        style={{ width: 150 }}
                        value={filterAccount}
                        onChange={setFilterAccount}
                        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                    />
                    <Select
                        placeholder="Tip"
                        allowClear
                        style={{ width: 120 }}
                        value={filterType}
                        onChange={setFilterType}
                        options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
                    />
                    <Select
                        placeholder="Onay"
                        allowClear
                        style={{ width: 120 }}
                        value={filterConfirmed}
                        onChange={setFilterConfirmed}
                        options={[
                            { value: 'true', label: 'Onaylı' },
                            { value: 'false', label: 'Bekleyen' },
                        ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Yenile</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Yeni İşlem
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={transactions}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                size="middle"
            />

            <Modal
                title="Yeni Finansal İşlem"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Kaydet"
                cancelText="İptal"
                width={480}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="accountId" label="Hesap" rules={[{ required: true, message: 'Hesap seçin' }]}>
                        <Select
                            options={accounts.map((a) => ({
                                value: a.id,
                                label: `${a.name} (${a.currency.symbol})`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="referenceType" label="Kaynak Tipi" extra="Seçime göre işlem tipi otomatik ayarlanır">
                        <Select
                            allowClear
                            onChange={(val) => {
                                if (val === 'ORDER') form.setFieldsValue({ type: 'COLLECTION' });
                                else if (val === 'SHIPMENT') form.setFieldsValue({ type: 'PAYMENT' });
                                else if (val === 'MANUAL') form.setFieldsValue({ type: undefined });
                            }}
                            options={[
                                { value: 'ORDER', label: '📦 Sipariş → Tahsilat' },
                                { value: 'SHIPMENT', label: '🚛 Sevkiyat → Ödeme' },
                                { value: 'MANUAL', label: '✏️ Manuel' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="type" label="İşlem Tipi" rules={[{ required: true, message: 'Tip seçin' }]}>
                        <Select options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} />
                    </Form.Item>
                    <Form.Item name="amount" label="Tutar" rules={[{ required: true, message: 'Tutar girin' }]}>
                        <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Açıklama">
                        <Input.TextArea rows={2} placeholder="Ör: Müşteri A tahsilatı" />
                    </Form.Item>
                    <Form.Item name="maturityDate" label="Vade Tarihi">
                        <Input type="date" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
