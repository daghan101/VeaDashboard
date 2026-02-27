import { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, InputNumber, Space,
    Typography, message, Popconfirm, Tag, Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Title } = Typography;

interface Product {
    id: string;
    name: string;
    category: string;
    subCategory: string | null;
    unit: string;
    avgUnitWeight: string | null;
    fireTolerance: string | null;
    isActive: boolean;
}

const categories = [
    { value: 'Dana', label: 'Dana' },
    { value: 'Tavuk', label: 'Tavuk' },
    { value: 'Kuzu', label: 'Kuzu' },
    { value: 'Sakatat', label: 'Sakatat' },
    { value: 'Diğer', label: 'Diğer' },
];

const categoryColors: Record<string, string> = {
    Dana: 'red',
    Tavuk: 'gold',
    Kuzu: 'green',
    Sakatat: 'purple',
    Diğer: 'default',
};

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [form] = Form.useForm();

    const fetchProducts = async (categoryStr?: string, page: number = 1, size: number = 20, showInactive: boolean = false) => {
        setLoading(true);
        try {
            const params: Record<string, string | number | boolean> = {
                skip: (page - 1) * size,
                take: size,
                includeInactive: showInactive
            };
            if (categoryStr) params.category = categoryStr;
            const res = await api.get('/products', { params });
            setProducts(res.data.data);
            setTotalCount(res.data.meta.total);
            setCurrentPage(page);
            setPageSize(size);
        } catch {
            message.error('Ürünler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts(categoryFilter, 1, pageSize, includeInactive);
    }, [categoryFilter, includeInactive]);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ unit: 'KG', isActive: true });
        setModalOpen(true);
    };

    const openEdit = (product: Product) => {
        setEditing(product);
        form.setFieldsValue({
            name: product.name,
            category: product.category,
            subCategory: product.subCategory,
            unit: product.unit,
            avgUnitWeight: product.avgUnitWeight ? Number(product.avgUnitWeight) : undefined,
            fireTolerance: product.fireTolerance ? Number(product.fireTolerance) : undefined,
            isActive: product.isActive,
        });
        setModalOpen(true);
    };

    const handleSave = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            if (editing) {
                await api.patch(`/products/${editing.id}`, values);
                message.success('Ürün güncellendi');
            } else {
                await api.post('/products', values);
                message.success('Ürün oluşturuldu');
            }
            setModalOpen(false);
            fetchProducts(categoryFilter, currentPage, pageSize, includeInactive);
        } catch {
            message.error('İşlem başarısız');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/products/${id}`);
            message.success('Ürün ve bağlı stok kaydı silindi (pasife alındı)');
            fetchProducts(categoryFilter, currentPage, pageSize, includeInactive);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Silme başarısız';
            message.error(errorMsg);
        }
    };

    const columns: ColumnsType<Product> = [
        {
            title: 'Ürün Adı',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Kategori',
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (cat: string) => <Tag color={categoryColors[cat]}>{cat}</Tag>,
        },
        {
            title: 'Alt Kategori',
            dataIndex: 'subCategory',
            key: 'subCategory',
            width: 130,
            render: (val: string | null) => val || '—',
        },
        {
            title: 'Birim',
            dataIndex: 'unit',
            key: 'unit',
            width: 80,
        },
        {
            title: 'Ort. Ağırlık',
            dataIndex: 'avgUnitWeight',
            key: 'avgUnitWeight',
            width: 120,
            align: 'right',
            render: (val: string | null) => {
                if (val == null) return '—';
                const num = Number(val);
                return isNaN(num) ? '—' : `${num} KG`;
            },
        },
        {
            title: 'Durum',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 90,
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>{active ? 'Aktif' : 'Pasif'}</Tag>
            ),
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    {record.isActive && (
                        <Popconfirm
                            title="Bu ürünü silmek (pasife almak) istediğinize emin misiniz?"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Evet"
                            cancelText="Hayır"
                        >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Ürünler</Title>
                <Space>
                    <Switch
                        checkedChildren="Tümünü Göster"
                        unCheckedChildren="Aktifler"
                        checked={includeInactive}
                        onChange={(val) => setIncludeInactive(val)}
                    />
                    <Select
                        placeholder="Kategori"
                        allowClear
                        style={{ width: 140 }}
                        value={categoryFilter}
                        onChange={(val) => setCategoryFilter(val)}
                        options={categories}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchProducts(categoryFilter, currentPage, pageSize, includeInactive)}>Yenile</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni Ürün</Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: totalCount,
                    showSizeChanger: true,
                    onChange: (page, size) => fetchProducts(categoryFilter, page, size, includeInactive),
                }}
                size="middle"
            />

            <Modal
                title={editing ? 'Ürün Düzenle' : 'Yeni Ürün'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Kaydet"
                cancelText="İptal"
                width={500}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Ürün Adı" rules={[{ required: true, message: 'Ürün adı gerekli' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label="Kategori" rules={[{ required: true, message: 'Kategori seçin' }]}>
                        <Select options={categories} />
                    </Form.Item>
                    <Form.Item name="subCategory" label="Alt Kategori">
                        <Input placeholder="Ör: But, Kol, Karkas" />
                    </Form.Item>
                    <Space size="large">
                        <Form.Item name="unit" label="Birim">
                            <Select style={{ width: 100 }} options={[
                                { value: 'KG', label: 'KG' },
                                { value: 'ADET', label: 'Adet' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="avgUnitWeight" label="Ort. Birim Ağırlık (KG)">
                            <InputNumber min={0} step={0.5} style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name="fireTolerance" label="Fire Toleransı (%)">
                            <InputNumber min={0} max={100} step={0.5} style={{ width: 150 }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="isActive" label="Aktif" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
