import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table, Button, Modal, Form, Input, Space,
    Typography, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Title } = Typography;

interface Customer {
    id: string;
    businessName: string;
    contactName: string | null;
    phone: string | null;
    address: string | null;
    balanceTry: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Customer | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch {
            message.error('Müşteriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (customer: Customer, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(customer);
        form.setFieldsValue({
            businessName: customer.businessName,
            contactName: customer.contactName,
            phone: customer.phone,
            address: customer.address,
        });
        setModalOpen(true);
    };

    const handleSave = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            if (editing) {
                await api.patch(`/customers/${editing.id}`, values);
                message.success('Müşteri güncellendi');
            } else {
                await api.post('/customers', values);
                message.success('Müşteri oluşturuldu');
            }
            setModalOpen(false);
            fetchCustomers();
        } catch {
            message.error('İşlem başarısız');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/customers/${id}`);
            message.success('Müşteri silindi');
            fetchCustomers();
        } catch {
            message.error('Silme başarısız');
        }
    };

    const columns: ColumnsType<Customer> = [
        {
            title: 'İşletme Adı',
            dataIndex: 'businessName',
            key: 'businessName',
            sorter: (a, b) => a.businessName.localeCompare(b.businessName),
        },
        {
            title: 'Yetkili',
            dataIndex: 'contactName',
            key: 'contactName',
            width: 160,
            render: (val: string | null) => val || '—',
        },
        {
            title: 'Telefon',
            dataIndex: 'phone',
            key: 'phone',
            width: 140,
            render: (val: string | null) => val || '—',
        },
        {
            title: 'Bakiye (₺)',
            dataIndex: 'balanceTry',
            key: 'balance',
            width: 140,
            align: 'right',
            sorter: (a, b) => Number(a.balanceTry) - Number(b.balanceTry),
            render: (val: string) => {
                const num = Number(val);
                if (isNaN(num)) return '₺0,00';
                return (
                    <span style={{ color: num > 0 ? '#ff4d4f' : num < 0 ? '#52c41a' : undefined, fontWeight: 600 }}>
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
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => openEdit(record, e)} />
                    <Popconfirm
                        title="Bu müşteriyi silmek istediğinize emin misiniz?"
                        onConfirm={(e) => handleDelete(record.id, e as React.MouseEvent)}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Evet"
                        cancelText="Hayır"
                    >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Müşteriler</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchCustomers}>Yenile</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni Müşteri</Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={customers}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                size="middle"
                onRow={(record) => ({
                    onClick: () => navigate(`/customers/${record.id}`),
                    style: { cursor: 'pointer' },
                })}
            />

            <Modal
                title={editing ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText="Kaydet"
                cancelText="İptal"
                width={450}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="businessName" label="İşletme Adı" rules={[{ required: true, message: 'İşletme adı gerekli' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="contactName" label="Yetkili Kişi">
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone" label="Telefon">
                        <Input />
                    </Form.Item>
                    <Form.Item name="address" label="Adres">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
