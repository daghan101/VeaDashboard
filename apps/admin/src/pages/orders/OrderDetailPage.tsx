import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Descriptions, Table, Tag, Button, Space, Typography, Spin, message,
    Modal, InputNumber, Form, Popconfirm, Divider,
} from 'antd';
import {
    ArrowLeftOutlined, CheckCircleOutlined, ToolOutlined,
    CarOutlined, FileDoneOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title } = Typography;

interface OrderItem {
    id: string;
    requestedQuantity: string;
    confirmedQuantity: string | null;
    deliveredQuantity: string | null;
    unitPrice: string | null;
    subtotal: string | null;
    unit: string;
    product: {
        id: string;
        name: string;
        category: string;
    };
}

interface OrderDetail {
    id: string;
    status: string;
    source: string;
    totalAmount: string | null;
    notes: string | null;
    createdAt: string;
    confirmedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    customer: {
        id: string;
        businessName: string;
        contactName: string | null;
        phone: string | null;
    };
    items: OrderItem[];
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

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [confirmForm] = Form.useForm();

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/orders/${id}`);
            setOrder(res.data);
        } catch {
            message.error('Sipariş yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAction = async (action: string) => {
        setActionLoading(true);
        try {
            await api.patch(`/orders/${id}/${action}`);
            message.success('İşlem başarılı');
            fetchOrder();
        } catch {
            message.error('İşlem başarısız');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirm = async (values: { items: { id: string; confirmedQuantity: number; unitPrice: number }[] }) => {
        setActionLoading(true);
        try {
            await api.patch(`/orders/${id}/confirm`, {
                items: values.items.map((item) => ({
                    orderItemId: item.id,
                    confirmedQuantity: item.confirmedQuantity,
                    unitPrice: item.unitPrice,
                })),
            });
            message.success('Sipariş onaylandı');
            setConfirmModalOpen(false);
            fetchOrder();
        } catch {
            message.error('Onaylama başarısız');
        } finally {
            setActionLoading(false);
        }
    };

    const openConfirmModal = () => {
        if (!order) return;
        confirmForm.setFieldsValue({
            items: order.items.map((item) => ({
                id: item.id,
                confirmedQuantity: Number(item.requestedQuantity),
                unitPrice: 0,
            })),
        });
        setConfirmModalOpen(true);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!order) {
        return <div>Sipariş bulunamadı</div>;
    }

    const itemColumns = [
        {
            title: 'Ürün',
            dataIndex: ['product', 'name'],
            key: 'product',
        },
        {
            title: 'Kategori',
            dataIndex: ['product', 'category'],
            key: 'category',
            width: 120,
        },
        {
            title: 'İstenen',
            dataIndex: 'requestedQuantity',
            key: 'requested',
            width: 100,
            align: 'right' as const,
            render: (val: string, record: OrderItem) => `${Number(val)} ${record.unit}`,
        },
        {
            title: 'Onaylanan',
            dataIndex: 'confirmedQuantity',
            key: 'confirmed',
            width: 100,
            align: 'right' as const,
            render: (val: string | null, record: OrderItem) => val ? `${Number(val)} ${record.unit}` : '—',
        },
        {
            title: 'Birim Fiyat',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            width: 120,
            align: 'right' as const,
            render: (val: string | null) => val ? `₺${Number(val).toLocaleString('tr-TR')}` : '—',
        },
        {
            title: 'Ara Toplam',
            dataIndex: 'subtotal',
            key: 'subtotal',
            width: 130,
            align: 'right' as const,
            render: (val: string | null) =>
                val ? `₺${Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—',
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
                    Siparişlere Dön
                </Button>
            </Space>

            <Title level={4}>
                Sipariş Detayı
                <Tag color={statusColors[order.status]} style={{ marginLeft: 12, fontSize: 14 }}>
                    {statusLabels[order.status]}
                </Tag>
            </Title>

            <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                    <Descriptions.Item label="Müşteri">{order.customer.businessName}</Descriptions.Item>
                    <Descriptions.Item label="İletişim">{order.customer.contactName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Telefon">{order.customer.phone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Kaynak">
                        {order.source === 'ADMIN_PANEL' ? 'Admin Paneli' : 'Müşteri App'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Oluşturma">{dayjs(order.createdAt).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="Toplam Tutar">
                        {order.totalAmount ? `₺${Number(order.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                    </Descriptions.Item>
                    {order.notes && <Descriptions.Item label="Notlar" span={3}>{order.notes}</Descriptions.Item>}
                </Descriptions>
            </Card>

            <Card title="Sipariş Kalemleri" style={{ marginBottom: 16, borderRadius: 8 }}>
                <Table
                    columns={itemColumns}
                    dataSource={order.items}
                    rowKey="id"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Divider />

            {/* Durum Akışı Butonları */}
            <Space>
                {order.status === 'PENDING' && (
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={openConfirmModal}
                        loading={actionLoading}
                    >
                        Onayla ve Fiyatlandır
                    </Button>
                )}
                {order.status === 'CONFIRMED' && (
                    <Button
                        type="primary"
                        icon={<ToolOutlined />}
                        onClick={() => handleAction('prepare')}
                        loading={actionLoading}
                        style={{ background: '#13c2c2' }}
                    >
                        Hazırla
                    </Button>
                )}
                {order.status === 'PREPARING' && (
                    <Button
                        type="primary"
                        icon={<CarOutlined />}
                        onClick={() => handleAction('ship')}
                        loading={actionLoading}
                        style={{ background: '#2f54eb' }}
                    >
                        Sevk Et
                    </Button>
                )}
                {order.status === 'SHIPPED' && (
                    <Button
                        type="primary"
                        icon={<FileDoneOutlined />}
                        onClick={() => handleAction('deliver')}
                        loading={actionLoading}
                        style={{ background: '#52c41a' }}
                    >
                        Teslim Et
                    </Button>
                )}
                {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                    <Popconfirm
                        title="Bu siparişi iptal etmek istediğinize emin misiniz?"
                        onConfirm={() => handleAction('cancel')}
                        okText="Evet"
                        cancelText="Hayır"
                    >
                        <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>
                            İptal Et
                        </Button>
                    </Popconfirm>
                )}
            </Space>

            {/* Onaylama Modalı */}
            <Modal
                title="Sipariş Onayla — Fiyatlandırma"
                open={confirmModalOpen}
                onCancel={() => setConfirmModalOpen(false)}
                onOk={() => confirmForm.submit()}
                confirmLoading={actionLoading}
                width={600}
                okText="Onayla"
                cancelText="İptal"
            >
                <Form form={confirmForm} onFinish={handleConfirm} layout="vertical">
                    <Form.List name="items">
                        {(fields) => (
                            <div>
                                {fields.map((field) => {
                                    const item = order.items[field.name];
                                    return (
                                        <Card
                                            key={field.key}
                                            size="small"
                                            style={{ marginBottom: 12, borderRadius: 8 }}
                                            title={item?.product.name}
                                            extra={`İstenen: ${Number(item?.requestedQuantity)} ${item?.unit}`}
                                        >
                                            <Form.Item name={[field.name, 'id']} hidden>
                                                <InputNumber />
                                            </Form.Item>
                                            <Space size="large">
                                                <Form.Item
                                                    label="Onaylanan Miktar"
                                                    name={[field.name, 'confirmedQuantity']}
                                                    rules={[{ required: true, message: 'Miktar gerekli' }]}
                                                >
                                                    <InputNumber
                                                        min={0}
                                                        step={0.5}
                                                        addonAfter={item?.unit}
                                                        style={{ width: 160 }}
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    label="Birim Fiyat (₺)"
                                                    name={[field.name, 'unitPrice']}
                                                    rules={[{ required: true, message: 'Fiyat gerekli' }]}
                                                >
                                                    <InputNumber
                                                        min={0}
                                                        step={10}
                                                        addonAfter="₺"
                                                        style={{ width: 160 }}
                                                    />
                                                </Form.Item>
                                            </Space>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </div>
    );
}
