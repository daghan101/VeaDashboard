import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Spin, Typography } from 'antd';
import {
    ShoppingCartOutlined,
    CheckCircleOutlined,
    AppstoreOutlined,
    TeamOutlined,
    TruckOutlined,
    InboxOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface DashboardStats {
    pendingOrders: number;
    confirmedOrders: number;
    totalProducts: number;
    totalCustomers: number;
    totalVendors: number;
    inventoryItems: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [pendingRes, confirmedRes, productsRes, customersRes, vendorsRes, inventoryRes] = await Promise.all([
                    api.get('/orders', { params: { status: 'PENDING' } }),
                    api.get('/orders', { params: { status: 'CONFIRMED' } }),
                    api.get('/products'),
                    api.get('/customers'),
                    api.get('/vendors'),
                    api.get('/inventory'),
                ]);

                setStats({
                    pendingOrders: Array.isArray(pendingRes.data) ? pendingRes.data.length : 0,
                    confirmedOrders: Array.isArray(confirmedRes.data) ? confirmedRes.data.length : 0,
                    totalProducts: Array.isArray(productsRes.data) ? productsRes.data.length : 0,
                    totalCustomers: Array.isArray(customersRes.data) ? customersRes.data.length : 0,
                    totalVendors: Array.isArray(vendorsRes.data) ? vendorsRes.data.length : 0,
                    inventoryItems: Array.isArray(inventoryRes.data) ? inventoryRes.data.length : 0,
                });
            } catch (err) {
                console.error('Dashboard verileri yüklenemedi:', err);
                setStats({ pendingOrders: 0, confirmedOrders: 0, totalProducts: 0, totalCustomers: 0, totalVendors: 0, inventoryItems: 0 });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    const cards = [
        {
            title: 'Bekleyen Siparişler',
            value: stats?.pendingOrders ?? 0,
            icon: <ShoppingCartOutlined style={{ fontSize: 28, color: '#fa8c16' }} />,
            color: '#fff7e6',
            borderColor: '#ffd591',
            link: '/orders?status=PENDING',
        },
        {
            title: 'Onaylanan Siparişler',
            value: stats?.confirmedOrders ?? 0,
            icon: <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />,
            color: '#f6ffed',
            borderColor: '#b7eb8f',
            link: '/orders?status=CONFIRMED',
        },
        {
            title: 'Toplam Ürün',
            value: stats?.totalProducts ?? 0,
            icon: <AppstoreOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
            color: '#e6f4ff',
            borderColor: '#91caff',
            link: '/products',
        },
        {
            title: 'Stok Kalemleri',
            value: stats?.inventoryItems ?? 0,
            icon: <InboxOutlined style={{ fontSize: 28, color: '#13c2c2' }} />,
            color: '#e6fffb',
            borderColor: '#87e8de',
            link: '/inventory',
        },
        {
            title: 'Toplam Müşteri',
            value: stats?.totalCustomers ?? 0,
            icon: <TeamOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
            color: '#f9f0ff',
            borderColor: '#d3adf7',
            link: '/customers',
        },
        {
            title: 'Toplam Tedarikçi',
            value: stats?.totalVendors ?? 0,
            icon: <TruckOutlined style={{ fontSize: 28, color: '#eb2f96' }} />,
            color: '#fff0f6',
            borderColor: '#ffadd2',
            link: '/vendors',
        },
    ];

    return (
        <div>
            <Title level={4} style={{ marginBottom: 24 }}>
                Dashboard
            </Title>

            <Row gutter={[16, 16]}>
                {cards.map((card) => (
                    <Col xs={24} sm={12} lg={8} xl={4} key={card.title}>
                        <Card
                            hoverable
                            onClick={() => navigate(card.link)}
                            style={{
                                borderRadius: 12,
                                background: card.color,
                                border: `1px solid ${card.borderColor}`,
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                            styles={{ body: { padding: '20px 24px' } }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Statistic title={card.title} value={card.value} />
                                {card.icon}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
