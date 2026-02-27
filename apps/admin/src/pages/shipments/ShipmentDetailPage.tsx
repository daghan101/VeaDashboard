import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Descriptions, Table, Tag, Button, Space, Typography, Spin, message,
    Modal, Form, Select, InputNumber, Popconfirm, Divider, Statistic, Row, Col,
} from 'antd';
import {
    ArrowLeftOutlined, PlusOutlined, CheckCircleOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title } = Typography;

interface Product {
    id: string;
    name: string;
    category: string;
}

interface ShipmentItem {
    id: string;
    productId: string;
    product: Product;
    expectedWeight: number | null;
    actualWeight: number | null;
    expectedCount: number | null;
    actualCount: number | null;
    unitPrice: number | null;
    anomalyStatus: string;
    weighedAt: string | null;
    weighedBy: { id: string; name: string } | null;
}

interface ShipmentDetail {
    id: string;
    status: string;
    declaredTotal: string | null;
    actualTotal: string | null;
    createdAt: string;
    completedAt: string | null;
    vendor: {
        id: string;
        name: string;
        phone: string | null;
    };
    createdBy: { id: string; name: string };
    items: ShipmentItem[];
}

const statusColors: Record<string, string> = {
    PENDING: 'orange',
    WEIGHING: 'processing',
    COMPLETED: 'green',
};

const statusLabels: Record<string, string> = {
    PENDING: 'Bekliyor',
    WEIGHING: 'Tartılıyor',
    COMPLETED: 'Tamamlandı',
};

export default function ShipmentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addSaving, setAddSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchShipment = async () => {
        try {
            const [shipRes, prodRes] = await Promise.all([
                api.get(`/shipments/${id}`),
                api.get('/products', { params: { take: 1000 } }),
            ]);
            setShipment(shipRes.data);
            setProducts(prodRes.data.data ?? []);
        } catch {
            message.error('Sevkiyat yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipment();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAddItem = async (values: Record<string, unknown>) => {
        setAddSaving(true);
        try {
            await api.post(`/shipments/${id}/items`, values);
            message.success('Kalem eklendi');
            setAddModalOpen(false);
            form.resetFields();
            fetchShipment();
        } catch {
            message.error('Kalem eklenemedi');
        } finally {
            setAddSaving(false);
        }
    };

    const handleStartWeighing = async () => {
        setActionLoading(true);
        try {
            await api.patch(`/shipments/${id}/start-weighing`);
            message.success('Tartım başlatıldı');
            fetchShipment();
        } catch {
            message.error('Tartım başlatılamadı');
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async () => {
        setActionLoading(true);
        try {
            await api.patch(`/shipments/${id}/complete`);
            message.success('Sevkiyat tamamlandı — stok güncellendi!');
            fetchShipment();
        } catch {
            message.error('Tamamlama başarısız');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
    }

    if (!shipment) {
        return <div style={{ textAlign: 'center', padding: 80 }}>Sevkiyat bulunamadı.</div>;
    }

    const canAddItems = ['PENDING', 'WEIGHING'].includes(shipment.status);
    const canStartWeighing = shipment.status === 'PENDING';
    const canComplete = shipment.status === 'WEIGHING';
    const isCompleted = shipment.status === 'COMPLETED';

    // Calculate totals
    const totalWeight = shipment.items.reduce((sum, item) => sum + (Number(item.actualWeight) || 0), 0);
    const totalPieces = shipment.items.reduce((sum, item) => sum + (Number(item.actualCount) || 0), 0);
    const totalAmount = shipment.items.reduce((sum, item) => {
        const w = Number(item.actualWeight) || 0;
        const p = Number(item.unitPrice) || 0;
        return sum + (w * p);
    }, 0);

    const itemColumns = [
        {
            title: 'Ürün',
            dataIndex: ['product', 'name'],
            key: 'product',
        },
        {
            title: 'Gerçek Ağırlık (KG)',
            dataIndex: 'actualWeight',
            key: 'actualWeight',
            width: 150,
            align: 'right' as const,
            render: (val: number | null) => val != null ? Number(val).toFixed(2) : '—',
        },
        {
            title: 'Adet',
            dataIndex: 'actualCount',
            key: 'actualCount',
            width: 80,
            align: 'center' as const,
            render: (val: number | null) => val ?? '—',
        },
        {
            title: 'Birim Fiyat',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            width: 120,
            align: 'right' as const,
            render: (val: number | null) => {
                if (val == null) return '—';
                const num = Number(val);
                return isNaN(num) ? '—' : `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
            },
        },
        {
            title: 'Tutar',
            key: 'subtotal',
            width: 130,
            align: 'right' as const,
            render: (_: unknown, record: ShipmentItem) => {
                const w = Number(record.actualWeight) || 0;
                const p = Number(record.unitPrice) || 0;
                if (!w || !p) return '—';
                const sub = w * p;
                return `₺${sub.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
            },
        },
        {
            title: 'Durum',
            dataIndex: 'anomalyStatus',
            key: 'anomalyStatus',
            width: 90,
            render: (val: string) => {
                const colors: Record<string, string> = { OK: 'green', FIRE: 'orange', LOSS: 'red', EXCESS: 'blue' };
                return <Tag color={colors[val] || 'default'}>{val}</Tag>;
            },
        },
        {
            title: 'Tartan',
            key: 'weighedBy',
            width: 120,
            render: (_: unknown, record: ShipmentItem) => record.weighedBy?.name || '—',
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/shipments')}>
                    Geri
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                    Sevkiyat Detay
                </Title>
                <Tag color={statusColors[shipment.status]} style={{ fontSize: 14, padding: '2px 12px' }}>
                    {statusLabels[shipment.status]}
                </Tag>
            </Space>

            <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                    <Descriptions.Item label="Tedarikçi">
                        <strong>{shipment.vendor.name}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Telefon">
                        {shipment.vendor.phone || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Oluşturan">
                        {shipment.createdBy.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Oluşturma Tarihi">
                        {dayjs(shipment.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Descriptions.Item>
                    {shipment.completedAt && (
                        <Descriptions.Item label="Tamamlanma Tarihi">
                            {dayjs(shipment.completedAt).format('DD.MM.YYYY HH:mm')}
                        </Descriptions.Item>
                    )}
                    {shipment.declaredTotal && (
                        <Descriptions.Item label="Beyan Tutar">
                            ₺{Number(shipment.declaredTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>

            {/* Summary Stats */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={8}>
                    <Card size="small" style={{ borderRadius: 8 }}>
                        <Statistic title="Toplam Ağırlık" value={totalWeight} precision={2} suffix="KG" />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{ borderRadius: 8 }}>
                        <Statistic title="Toplam Adet" value={totalPieces} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card size="small" style={{ borderRadius: 8 }}>
                        <Statistic
                            title="Toplam Tutar"
                            value={totalAmount}
                            precision={2}
                            prefix="₺"
                            valueStyle={{ color: totalAmount > 0 ? '#cf1322' : undefined }}
                        />
                    </Card>
                </Col>
            </Row>

            <Divider orientation="left">
                Kalemler ({shipment.items.length})
            </Divider>

            {/* Action Buttons */}
            <Space style={{ marginBottom: 12 }}>
                {canAddItems && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAddModalOpen(true); }}>
                        Kalem Ekle
                    </Button>
                )}
                {canStartWeighing && (
                    <Button
                        icon={<PlayCircleOutlined />}
                        onClick={handleStartWeighing}
                        loading={actionLoading}
                    >
                        Tartıma Başla
                    </Button>
                )}
                {canComplete && (
                    <Popconfirm
                        title="Sevkiyatı tamamlamak istiyor musunuz?"
                        description="Stok güncellenir ve tedarikçiye borç yazılır."
                        onConfirm={handleComplete}
                        okText="Evet, Tamamla"
                        cancelText="İptal"
                    >
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={actionLoading}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        >
                            Tamamla
                        </Button>
                    </Popconfirm>
                )}
                {isCompleted && (
                    <Tag icon={<CheckCircleOutlined />} color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                        Bu sevkiyat tamamlandı
                    </Tag>
                )}
            </Space>

            <Table
                columns={itemColumns}
                dataSource={shipment.items}
                rowKey="id"
                pagination={false}
                size="middle"
            />

            {/* Add Item Modal */}
            <Modal
                title="Kalem Ekle"
                open={addModalOpen}
                onCancel={() => setAddModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={addSaving}
                okText="Ekle"
                cancelText="İptal"
                width={480}
            >
                <Form form={form} layout="vertical" onFinish={handleAddItem}>
                    <Form.Item name="productId" label="Ürün" rules={[{ required: true, message: 'Ürün seçin' }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={products.map((p) => ({
                                value: p.id,
                                label: `${p.name} (${p.category})`,
                            }))}
                        />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="actualWeight" label="Gerçek Ağırlık (KG)" rules={[{ required: true, message: 'Ağırlık girin' }]}>
                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="actualCount" label="Adet">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="unitPrice" label="Birim Fiyat (₺/KG)">
                                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="anomalyStatus" label="Durum" initialValue="OK">
                                <Select options={[
                                    { value: 'OK', label: 'Normal' },
                                    { value: 'FIRE', label: 'Fire' },
                                    { value: 'LOSS', label: 'Kayıp' },
                                    { value: 'EXCESS', label: 'Fazla' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="expectedWeight" label="Beklenen Ağırlık (KG)" extra="İrsaliye ağırlığı">
                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expectedCount" label="Beklenen Adet">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}
