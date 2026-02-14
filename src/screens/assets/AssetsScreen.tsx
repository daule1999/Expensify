import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { assetService, Asset } from '../../services/asset.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';

export const AssetsScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [totalValue, setTotalValue] = useState(0);

    const loadData = async () => {
        try {
            const data = await assetService.getAllAssets();
            setAssets(data);
            setTotalValue(assetService.getTotalValue(data));
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Asset',
            'Are you sure you want to remove this asset?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await assetService.deleteAsset(id);
                        loadData();
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <GlassHeader title="Assets" />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />}
            >
                {/* Summary Card */}
                <GlassCard style={styles.summaryCard}>
                    <View style={styles.summaryContent}>
                        <View>
                            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Asset Value</Text>
                            <AmountDisplay amount={totalValue} size="large" style={[styles.summaryAmount, { color: theme.colors.text }]} />
                        </View>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
                            <Ionicons name="diamond-outline" size={32} color="#FFD700" />
                        </View>
                    </View>
                </GlassCard>

                {assets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="home-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.text }]}>No assets yet</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Add your home, car, or other properties</Text>
                    </View>
                ) : (
                    assets.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.7}
                            onLongPress={() => handleDelete(item.id)}
                        // onPress={() => navigation.navigate('EditAsset', { asset: item })} // Future
                        >
                            <GlassCard style={styles.assetCard}>
                                <View style={styles.assetHeader}>
                                    <View style={styles.assetIconInfo}>
                                        <View style={[styles.typeIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                            <Ionicons name={getAssetIcon(item.type)} size={24} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.assetName, { color: theme.colors.text }]}>{item.name}</Text>
                                            <Text style={[styles.assetType, { color: theme.colors.textSecondary }]}>{item.type}</Text>
                                        </View>
                                    </View>
                                    <View>
                                        <AmountDisplay amount={item.value} size="medium" style={{ color: theme.colors.text }} />
                                    </View>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('AddAsset' as never)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const getAssetIcon = (type: string) => {
    switch (type) {
        case 'Real Estate': return 'home';
        case 'Vehicle': return 'car';
        case 'Gold': return 'gift'; // Should calculate gold bars but gift is ok placeholder
        case 'Electronics': return 'laptop';
        default: return 'cube';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingTop: 110, // Header clearance
        paddingBottom: 100,
    },
    summaryCard: {
        marginBottom: 20,
    },
    summaryContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    summaryAmount: {
        fontWeight: 'bold',
    },
    iconContainer: {
        padding: 12,
        borderRadius: 20,
    },
    assetCard: {
        marginBottom: 12,
    },
    assetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    assetIconInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assetName: {
        fontSize: 16,
        fontWeight: '600',
    },
    assetType: {
        fontSize: 12,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
    },
});
