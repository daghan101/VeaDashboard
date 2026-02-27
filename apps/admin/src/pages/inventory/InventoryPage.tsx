import { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, InputNumber, Select, Space,
    Typography, message, Tag, Checkbox,
} from 'antd';
import { ReloadOutlined, ToolOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Title } = Typography;

interface InventoryItem {
    id: string;
    quantity: string;
    pieceCount: number | null;
    product: {
        id: string;
        name: string;
        category: string;
        unit: string;
    };
}

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lowStock, setLowStock] = useState(false);
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (lowStock) params.lowStock = 'true';
            const res = await api.get('/inventory', { params });
            setInventory(res.data);
        } catch {
            message.error('Stok verileri yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [lowStock]); // eslint-disable-line react-hooks/exhaustive-deps

    const openAdjust = (item: InventoryItem) => {
        setAdjusting(item);
        form.resetFields();
        form.setFieldsValue({ operation: 'INCREMENT', quantity: 0 });
        setAdjustModalOpen(true);
    };

    const handleAdjust = async (values: { operation: string; quantity: number; pieceCount?: number }) => {
        if (!adjusting) return;
        setSaving(true);
        try {
            await api.patch(`/inventory/${adjusting.product.id}/adjust`, values);
            message.success('Stok güncellendi');
            setAdjustModalOpen(false);
            fetchInventory();
        } catch {
            message.error('Stok güncelleme başarısız');
        } finally {
            setSaving(false);
        }
    };

    const columns: ColumnsType<InventoryItem> = [
        {
            title: 'Ürün',
            dataIndex: ['product', 'name'],
            key: 'product',
            sorter: (a, b) => a.product.name.localeCompare(b.product.name),
        },
        {
            title: 'Kategori',
            dataIndex: ['product', 'category'],
            key: 'category',
            width: 120,
        },
        {
            title: 'Miktar',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 140,
            align: 'right',
            sorter: (a, b) => Number(a.quantity) - Number(b.quantity),
            render: (val: string, record: InventoryItem) => {
                const num = Number(val);
                const isNegative = num < 0;
                const isLow = num >= 0 && num < 10;
                return (
                    <span style={{
                        color: isNegative ? '#ff4d4f' : isLow ? '#fa8c16' : undefined,
                        fontWeight: isNegative || isLow ? 600 : undefined,
                    }}>
                        {num.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} {record.product.unit}
                    </span>
                );
            },
        },
        {
            title: 'Adet',
            dataIndex: 'pieceCount',
            key: 'pieceCount',
            width: 80,
            align: 'right',
            render: (val: number | null) => val ?? '—',
        },
        {
            title: 'Durum',
            key: 'status',
            width: 120,
            render: (_, record) => {
                const qty = Number(record.quantity);
                if (qty < 0) return <Tag color="red">Negatif Stok</Tag>;
                if (qty === 0) return <Tag color="default">Stok Yok</Tag>;
                if (qty < 10) return <Tag color="orange">Düşük</Tag>;
                return <Tag color="green">Yeterli</Tag>;
            },
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<ToolOutlined />}
                    onClick={() => openAdjust(record)}
                    size="small"
                >
                    Ayarla
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Stok Durumu</Title>
                <Space>
                    <Checkbox checked={lowStock} onChange={(e) => setLowStock(e.target.checked)}>
                        Düşük stok
                    </Checkbox>
                    <Button icon={<ReloadOutlined />} onClick={fetchInventory}>Yenile</Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={inventory}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                size="middle"
            />

            <Modal
                title={`Stok Ayarla — ${adjusting?.product.name || ''}`}
                open={adjustModalOpen}
                onCancel={() => setAdjustModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Uygula"
                cancelText="İptal"
                width={400}
            >
                <Form form={form} layout="vertical" onFinish={handleAdjust}>
                    <Form.Item
                        name="operation"
                        label="İşlem"
                        rules={[{ required: true }]}
                    >
                        <Select options={[
                            { value: 'INCREMENT', label: 'Artır (+)' },
                            { value: 'DECREMENT', label: 'Azalt (-)' },
                            { value: 'SET', label: 'Değeri Ayarla (=)' },
                        ]} />
                    </Form.Item>
                    <Form.Item
                        name="quantity"
                        label={`Miktar (${adjusting?.product.unit || 'KG'})`}
                        rules={[{ required: true, message: 'Miktar girin' }]}
                    >
                        <InputNumber
                            min={0}
                            step={1}
                            style={{ width: '100%' }}
                            addonAfter={adjusting?.product.unit || 'KG'}
                        />
                    </Form.Item>
                    <Form.Item name="pieceCount" label="Adet (İsteğe bağlı)">
                        <InputNumber min={0} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                    {adjusting && (
                        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                            Mevcut stok: <strong>{Number(adjusting.quantity).toLocaleString('tr-TR')} {adjusting.product.unit}</strong>
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
