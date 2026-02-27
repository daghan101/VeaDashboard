import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table, Button, Modal, Form, Select, InputNumber, Space,
    Typography, message, Tag,
} from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title } = Typography;

interface Vendor {
    id: string;
    name: string;
}

interface Shipment {
    id: string;
    status: string;
    declaredTotal: string | null;
    actualTotal: string | null;
    createdAt: string;
    completedAt: string | null;
    vendor: { id: string; name: string };
    items: { id: string }[];
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

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filterStatus) params.status = filterStatus;

            const [shipRes, vendRes] = await Promise.all([
                api.get('/shipments', { params }),
                api.get('/vendors'),
            ]);
            setShipments(shipRes.data);
            setVendors(vendRes.data);
        } catch {
            message.error('Sevkiyatlar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreate = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            const res = await api.post('/shipments', values);
            message.success('Sevkiyat oluşturuldu');
            setModalOpen(false);
            form.resetFields();
            navigate(`/shipments/${res.data.id}`);
        } catch {
            message.error('Sevkiyat oluşturulamadı');
        } finally {
            setSaving(false);
        }
    };

    const columns: ColumnsType<Shipment> = [
        {
            title: 'Tarih',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
        },
        {
            title: 'Tedarikçi',
            dataIndex: ['vendor', 'name'],
            key: 'vendor',
        },
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
            title: 'Kalem',
            dataIndex: 'items',
            key: 'itemCount',
            width: 80,
            align: 'center',
            render: (items: { id: string }[]) => items?.length || 0,
        },
        {
            title: 'Beyan Tutar',
            dataIndex: 'declaredTotal',
            key: 'declaredTotal',
            width: 130,
            align: 'right',
            render: (val: string | null) => {
                if (!val) return '—';
                const num = Number(val);
                return isNaN(num) ? '—' : `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
            },
        },
        {
            title: 'Gerçek Tutar',
            dataIndex: 'actualTotal',
            key: 'actualTotal',
            width: 130,
            align: 'right',
            render: (val: string | null) => {
                if (!val) return '—';
                const num = Number(val);
                return isNaN(num) ? '—' : `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
            },
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 80,
            render: (_, record) => {
                const canDelete = ['PENDING', 'WEIGHING'].includes(record.status);
                if (!canDelete) return '—';
                return (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            Modal.confirm({
                                title: 'Sevkiyatı Sil',
                                content: 'Bu sevkiyatı silmek istediğinize emin misiniz? Tanımlı tüm kalemler de silinecektir.',
                                okText: 'Evet',
                                okType: 'danger',
                                cancelText: 'Hayır',
                                onOk: async () => {
                                    try {
                                        await api.delete(`/shipments/${record.id}`);
                                        message.success('Sevkiyat silindi');
                                        fetchData();
                                    } catch (error: any) {
                                        message.error(error.response?.data?.message || 'Sevkiyat silinemedi');
                                    }
                                }
                            });
                        }}
                    />
                );
            }
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Sevkiyatlar (Gelen Mal)</Title>
                <Space>
                    <Select
                        placeholder="Durum"
                        allowClear
                        style={{ width: 140 }}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Yenile</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Yeni Sevkiyat
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={shipments}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                size="middle"
                onRow={(record) => ({
                    onClick: () => navigate(`/shipments/${record.id}`),
                    style: { cursor: 'pointer' },
                })}
            />

            <Modal
                title="Yeni Sevkiyat"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Oluştur"
                cancelText="İptal"
                width={420}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="vendorId" label="Tedarikçi" rules={[{ required: true, message: 'Tedarikçi seçin' }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="declaredTotal" label="Beyan Tutar (₺)" extra="Tedarikçinin beyan ettiği toplam (opsiyonel)">
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
