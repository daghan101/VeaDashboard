import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Form, Select, InputNumber, Button, Space, Typography, message, Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;

interface Customer {
    id: string;
    businessName: string;
}

interface Product {
    id: string;
    name: string;
    category: string;
    unit: string;
}

export default function CreateOrderPage() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/products', { params: { take: 1000 } }),
                ]);
                setCustomers(custRes.data);
                setProducts(prodRes.data.data ?? []);
            } catch {
                message.error('Veriler yüklenemedi');
            }
        };
        fetchData();
    }, []);

    const onFinish = async (values: {
        customerId: string;
        notes?: string;
        items: { productId: string; requestedQuantity: number }[];
    }) => {
        setLoading(true);
        try {
            await api.post('/orders', {
                customerId: values.customerId,
                source: 'ADMIN_PANEL',
                notes: values.notes,
                items: values.items.map((item) => ({
                    productId: item.productId,
                    requestedQuantity: item.requestedQuantity,
                })),
            });
            message.success('Sipariş oluşturuldu');
            navigate('/orders');
        } catch {
            message.error('Sipariş oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    const getProductUnit = (productId: string) => {
        return products.find((p) => p.id === productId)?.unit || 'KG';
    };

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
                    Siparişlere Dön
                </Button>
            </Space>

            <Title level={4}>Yeni Sipariş</Title>

            <Card style={{ maxWidth: 700, borderRadius: 8 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ items: [{}] }}
                >
                    <Form.Item
                        name="customerId"
                        label="Müşteri"
                        rules={[{ required: true, message: 'Müşteri seçin' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Müşteri seçin"
                            optionFilterProp="label"
                            options={customers.map((c) => ({
                                value: c.id,
                                label: c.businessName,
                            }))}
                        />
                    </Form.Item>

                    <Divider>Sipariş Kalemleri</Divider>

                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map((field) => (
                                    <Card
                                        key={field.key}
                                        size="small"
                                        style={{ marginBottom: 12, borderRadius: 8, background: '#fafafa' }}
                                        extra={
                                            fields.length > 1 ? (
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => remove(field.name)}
                                                    size="small"
                                                />
                                            ) : null
                                        }
                                    >
                                        <Space size="large" align="start" wrap>
                                            <Form.Item
                                                name={[field.name, 'productId']}
                                                label="Ürün"
                                                rules={[{ required: true, message: 'Ürün seçin' }]}
                                                style={{ minWidth: 250 }}
                                            >
                                                <Select
                                                    showSearch
                                                    placeholder="Ürün seçin"
                                                    optionFilterProp="label"
                                                    options={products.map((p) => ({
                                                        value: p.id,
                                                        label: `${p.name} (${p.category})`,
                                                    }))}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                name={[field.name, 'requestedQuantity']}
                                                label="Miktar"
                                                rules={[
                                                    { required: true, message: 'Miktar girin' },
                                                    { type: 'number', min: 0.1, message: 'Geçerli miktar girin' },
                                                ]}
                                            >
                                                <InputNumber
                                                    min={0.1}
                                                    step={1}
                                                    style={{ width: 160 }}
                                                    addonAfter={
                                                        form.getFieldValue(['items', field.name, 'productId'])
                                                            ? getProductUnit(form.getFieldValue(['items', field.name, 'productId']))
                                                            : 'KG'
                                                    }
                                                />
                                            </Form.Item>
                                        </Space>
                                    </Card>
                                ))}

                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                    icon={<PlusOutlined />}
                                    style={{ marginBottom: 16 }}
                                >
                                    Kalem Ekle
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={<SaveOutlined />}
                            size="large"
                        >
                            Siparişi Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
