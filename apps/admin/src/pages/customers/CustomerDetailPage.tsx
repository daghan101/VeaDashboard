import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Descriptions, Table, Tag, Button, Space, Typography, Spin, Statistic, message,
} from 'antd';
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title } = Typography;

interface CustomerDetail {
    id: string;
    businessName: string;
    contactName: string | null;
    phone: string | null;
    address: string | null;
    balanceTry: string;
}

interface Order {
    id: string;
    status: string;
    totalAmount: string | null;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    PENDING: 'orange',
    CONFIRMED: 'blue',
    PREPARING: 'cyan',
    SHIPPED: 'geekblue',
    DELIVERED: 'green',
    CANCELLED: 'red',
};

const statusLabels: Record<string, string> = {
    PENDING: 'Bekliyor',
    CONFIRMED: 'Onaylandı',
    PREPARING: 'Hazırlanıyor',
    SHIPPED: 'Sevk Edildi',
    DELIVERED: 'Teslim Edildi',
    CANCELLED: 'İptal',
};

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, ordersRes] = await Promise.all([
                    api.get(`/customers/${id}`),
                    api.get('/orders', { params: { customerId: id } }),
                ]);
                setCustomer(custRes.data);
                setOrders(ordersRes.data);
            } catch {
                message.error('Müşteri bilgileri yüklenemedi');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
    }

    if (!customer) {
        return <div>Müşteri bulunamadı</div>;
    }

    const balance = Number(customer.balanceTry);

    const orderColumns = [
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={statusColors[status]}>{statusLabels[status] || status}</Tag>
            ),
        },
        {
            title: 'Tutar',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 130,
            align: 'right' as const,
            render: (val: string | null) =>
                val ? `₺${Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—',
        },
        {
            title: 'Tarih',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')}>
                    Müşterilere Dön
                </Button>
            </Space>

            <Title level={4}>{customer.businessName}</Title>

            <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 32 }}>
                    <div style={{ flex: 1 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Yetkili">{customer.contactName || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Telefon">{customer.phone || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Adres">{customer.address || '—'}</Descriptions.Item>
                        </Descriptions>
                    </div>
                    <Card
                        style={{
                            borderRadius: 8,
                            background: balance > 0 ? '#fff2f0' : '#f6ffed',
                            border: `1px solid ${balance > 0 ? '#ffccc7' : '#b7eb8f'}`,
                            minWidth: 200,
                        }}
                    >
                        <Statistic
                            title="Bakiye"
                            value={balance}
                            precision={2}
                            prefix="₺"
                            valueStyle={{ color: balance > 0 ? '#cf1322' : '#3f8600' }}
                            suffix={balance > 0 ? '(Borç)' : balance < 0 ? '(Alacak)' : ''}
                        />
                    </Card>
                </div>
            </Card>

            <Card
                title={
                    <Space>
                        <ShoppingCartOutlined />
                        Siparişler ({orders.length})
                    </Space>
                }
                style={{ borderRadius: 8 }}
            >
                <Table
                    columns={orderColumns}
                    dataSource={orders}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    onRow={(record) => ({
                        onClick: () => navigate(`/orders/${record.id}`),
                        style: { cursor: 'pointer' },
                    })}
                    locale={{ emptyText: 'Sipariş bulunamadı' }}
                />
            </Card>
        </div>
    );
}
