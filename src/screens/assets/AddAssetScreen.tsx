import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import { assetService } from '../../services/asset.service';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';
import { GlassInput } from '../../components/GlassInput';
import { useTheme } from '../../contexts/ThemeContext';

const ASSET_TYPES = ['Real Estate', 'Vehicle', 'Gold', 'Electronics', 'Other'];

export const AddAssetScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();

    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [type, setType] = useState(ASSET_TYPES[0]);
    const [purchaseDate, setPurchaseDate] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSave = async () => {
        if (!name || !value) {
            Alert.alert('Error', 'Please fill in name and value');
            return;
        }

        try {
            await assetService.addAsset({
                name,
                type,
                value: parseFloat(value),
                purchase_date: purchaseDate.getTime(),
                notes
            });
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save asset');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <GlassHeader title="Add Asset" showBack />

            <ScrollView contentContainerStyle={styles.content}>
                <GlassCard style={styles.section}>
                    <GlassInput
                        label="Asset Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. My Apartment, Tesla Model 3"
                        icon="cube-outline"
                    />

                    <GlassInput
                        label="Total Value"
                        value={value}
                        onChangeText={setValue}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        icon="pricetag-outline"
                    />
                </GlassCard>

                <Text style={[styles.label, { color: theme.colors.text }]}>Asset Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                    {ASSET_TYPES.map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.typeChip,
                                type === t ? { backgroundColor: theme.colors.primary } : { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)' }
                            ]}
                            onPress={() => setType(t)}
                        >
                            <Text style={[
                                styles.typeText,
                                type === t ? { color: '#fff' } : { color: theme.colors.text }
                            ]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <GlassCard style={styles.section}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Purchase Date</Text>
                    <TouchableOpacity
                        style={[styles.dateButton, { borderColor: theme.colors.border }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={[styles.dateText, { color: theme.colors.text }]}>{purchaseDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={purchaseDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setPurchaseDate(selectedDate);
                            }}
                        />
                    )}

                    <View style={{ marginTop: 20 }}>
                        <GlassInput
                            label="Notes"
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Optional details..."
                            icon="document-text-outline"
                        />
                    </View>
                </GlassCard>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Asset</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingTop: 110,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    typeRow: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
    },
    typeText: {
        fontWeight: '600',
    },
    dateButton: {
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dateText: {
        fontSize: 16,
    },
    saveButton: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
