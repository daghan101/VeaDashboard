import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout, Menu, Button, Typography, theme, Dropdown } from 'antd';
import {
    DashboardOutlined,
    ShoppingCartOutlined,
    LogoutOutlined,
    UserOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AppstoreOutlined,
    InboxOutlined,
    TeamOutlined,
    TruckOutlined,
    BankOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
    {
        key: '/',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
    },
    {
        key: '/orders',
        icon: <ShoppingCartOutlined />,
        label: 'Siparişler',
    },
    {
        key: '/products',
        icon: <AppstoreOutlined />,
        label: 'Ürünler',
    },
    {
        key: '/inventory',
        icon: <InboxOutlined />,
        label: 'Stok',
    },
    {
        key: '/customers',
        icon: <TeamOutlined />,
        label: 'Müşteriler',
    },
    {
        key: '/vendors',
        icon: <TruckOutlined />,
        label: 'Tedarikçiler',
    },
    {
        key: '/shipments',
        icon: <ImportOutlined />,
        label: 'Sevkiyat',
    },
    {
        key: 'finance',
        icon: <BankOutlined />,
        label: 'Finans',
        children: [
            { key: '/accounts', label: 'Hesaplar' },
            { key: '/transactions', label: 'İşlemler' },
        ],
    },
];

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { token: themeToken } = theme.useToken();

    const handleMenuClick = ({ key }: { key: string }) => {
        navigate(key);
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    // Aktif menü öğesini belirle
    const selectedKey = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];

    const userMenuItems = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Çıkış Yap',
            onClick: handleLogout,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                style={{
                    background: '#001529',
                    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <Text
                        strong
                        style={{
                            color: '#fff',
                            fontSize: collapsed ? 20 : 18,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {collapsed ? '꩜' : 'Zeytinoğlu Et'}
                    </Text>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={handleMenuClick}
                    style={{ borderRight: 0, marginTop: 8 }}
                />
            </Sider>

            <Layout>
                <Header
                    style={{
                        padding: '0 24px',
                        background: themeToken.colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 16 }}
                    />

                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <Button type="text" icon={<UserOutlined />}>
                            {user?.name}
                        </Button>
                    </Dropdown>
                </Header>

                <Content
                    style={{
                        margin: 24,
                        padding: 24,
                        background: themeToken.colorBgContainer,
                        borderRadius: themeToken.borderRadiusLG,
                        minHeight: 280,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
