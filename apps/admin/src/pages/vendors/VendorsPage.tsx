import { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Space,
    Typography, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Title } = Typography;

interface Vendor {
    id: string;
    name: string;
    phone: string | null;
    totalBalance: string;
}

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Vendor | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vendors');
            setVendors(res.data);
        } catch {
            message.error('Tedarikçiler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (vendor: Vendor) => {
        setEditing(vendor);
        form.setFieldsValue({ name: vendor.name, phone: vendor.phone });
        setModalOpen(true);
    };

    const handleSave = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            if (editing) {
                await api.patch(`/vendors/${editing.id}`, values);
                message.success('Tedarikçi güncellendi');
            } else {
                await api.post('/vendors', values);
                message.success('Tedarikçi oluşturuldu');
            }
            setModalOpen(false);
            fetchVendors();
        } catch {
            message.error('İşlem başarısız');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/vendors/${id}`);
            message.success('Tedarikçi silindi');
            fetchVendors();
        } catch {
            message.error('Silme başarısız');
        }
    };

    const columns: ColumnsType<Vendor> = [
        {
            title: 'Tedarikçi Adı',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Telefon',
            dataIndex: 'phone',
            key: 'phone',
            width: 160,
            render: (val: string | null) => val || '—',
        },
        {
            title: 'Bakiye (₺)',
            dataIndex: 'totalBalance',
            key: 'balance',
            width: 140,
            align: 'right',
            render: (val: string) => {
                const num = Number(val);
                if (isNaN(num)) return '₺0,00';
                return (
                    <span style={{ color: num > 0 ? '#ff4d4f' : undefined, fontWeight: 600 }}>
                        ₺{num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                );
            },
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    <Popconfirm
                        title="Bu tedarikçiyi silmek istediğinize emin misiniz?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Evet"
                        cancelText="Hayır"
                    >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Tedarikçiler</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchVendors}>Yenile</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni Tedarikçi</Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={vendors}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                size="middle"
            />

            <Modal
                title={editing ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Kaydet"
                cancelText="İptal"
                width={400}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Tedarikçi Adı" rules={[{ required: true, message: 'Ad gerekli' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone" label="Telefon">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
