import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Tag, Button, Select, Space, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title } = Typography;

interface Order {
    id: string;
    status: string;
    source: string;
    totalAmount: string | null;
    notes: string | null;
    createdAt: string;
    customer: {
        id: string;
        businessName: string;
    };
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

export default function OrdersPage() {
    const [searchParams] = useSearchParams();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(
        searchParams.get('status') || undefined,
    );
    const navigate = useNavigate();

    const fetchOrders = async (status?: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (status) params.status = status;
            const res = await api.get('/orders', { params });
            setOrders(res.data);
        } catch {
            message.error('Siparişler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(statusFilter);
    }, [statusFilter]);

    const columns: ColumnsType<Order> = [
        {
            title: 'Müşteri',
            dataIndex: ['customer', 'businessName'],
            key: 'customer',
            ellipsis: true,
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (status: string) => (
                <Tag color={statusColors[status] || 'default'}>
                    {statusLabels[status] || status}
                </Tag>
            ),
        },
        {
            title: 'Kaynak',
            dataIndex: 'source',
            key: 'source',
            width: 130,
            render: (source: string) => (
                <Tag>{source === 'ADMIN_PANEL' ? 'Admin' : 'Müşteri App'}</Tag>
            ),
        },
        {
            title: 'Tutar',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 120,
            align: 'right',
            render: (amount: string | null) =>
                amount ? `₺${Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Siparişler</Title>
                <Space>
                    <Select
                        placeholder="Durum Filtresi"
                        allowClear
                        style={{ width: 160 }}
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                        options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchOrders(statusFilter)}>
                        Yenile
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/new')}>
                        Yeni Sipariş
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                onRow={(record) => ({
                    onClick: () => navigate(`/orders/${record.id}`),
                    style: { cursor: 'pointer' },
                })}
                locale={{
                    emptyText: 'Sipariş bulunamadı',
                }}
            />
        </div>
    );
}
