import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { settingsService, ExpenseSettings, CustomField } from '../../services/settings.service';
import * as Crypto from 'expo-crypto';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';

export const ExpenseSettingsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [settings, setSettings] = useState<ExpenseSettings | null>(null);
    const [categoryLabel, setCategoryLabel] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [showAddFieldModal, setShowAddFieldModal] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'select'>('text');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await settingsService.getExpenseSettings();
        setSettings(data);
        setCategoryLabel(data.categoryLabel);
        setCategories([...data.defaultCategories]);
    };

    const handleSave = async () => {
        if (!settings) return;

        const updated: ExpenseSettings = {
            ...settings,
            categoryLabel,
            defaultCategories: categories,
            customFields: settings.customFields // Include custom fields
        };

        try {
            await settingsService.saveExpenseSettings(updated);
            Alert.alert('Success', 'Expense settings saved!');
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
        }
    };

    const handleRemoveCategory = (index: number) => {
        setCategories(categories.filter((_, i) => i !== index));
    };

    const handleAddCustomField = () => {
        if (!settings || !newFieldName.trim()) {
            Alert.alert('Error', 'Please enter a field name');
            return;
        }

        const newField: CustomField = {
            id: Crypto.randomUUID(),
            name: newFieldName.trim(),
            type: newFieldType,
            required: false,
            enabled: true
        };

        const updated = {
            ...settings,
            customFields: [...settings.customFields, newField]
        };

        setSettings(updated);
        setNewFieldName('');
        setNewFieldType('text');
        setShowAddFieldModal(false);
    };

    const handleRemoveCustomField = (id: string) => {
        if (!settings) return;

        const updated = {
            ...settings,
            customFields: settings.customFields.filter(f => f.id !== id)
        };
        setSettings(updated);
    };

    const handleToggleRequired = (id: string, required: boolean) => {
        if (!settings) return;

        const updated = {
            ...settings,
            customFields: settings.customFields.map(f =>
                f.id === id ? { ...f, required } : f
            )
        };
        setSettings(updated);
    };

    const handleReset = () => {
        Alert.alert(
            'Reset Settings',
            'Are you sure you want to reset to default settings?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await settingsService.resetExpenseSettings();
                        loadSettings();
                    }
                }
            ]
        );
    };

    if (!settings) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title="Expense Settings"
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 100 }}
            >
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Field Labels</Text>
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Category Field Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={categoryLabel}
                            onChangeText={setCategoryLabel}
                            placeholder="e.g., Category, Tags, Type"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Change "Category" to any label you prefer</Text>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Manage Categories</Text>
                    <View style={styles.addContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={newCategory}
                            onChangeText={setNewCategory}
                            placeholder="Add new category"
                            placeholderTextColor={theme.colors.textSecondary}
                            onSubmitEditing={handleAddCategory}
                        />
                        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddCategory}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.categoryList}>
                        {categories.map((cat, index) => (
                            <View key={index} style={[styles.categoryItem, { backgroundColor: theme.colors.inputBackground }]}>
                                <Text style={[styles.categoryName, { color: theme.colors.text }]}>{cat}</Text>
                                <TouchableOpacity onPress={() => handleRemoveCategory(index)}>
                                    <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Custom Fields</Text>
                    <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Add extra fields like "Monthly Recurring", "Payment Method", etc.</Text>

                    {settings.customFields.map((field, index) => (
                        <View key={field.id} style={[styles.customFieldItem, { backgroundColor: theme.colors.inputBackground }]}>
                            <View style={styles.customFieldHeader}>
                                <Text style={[styles.customFieldName, { color: theme.colors.text }]}>{field.name}</Text>
                                <View style={styles.customFieldActions}>
                                    <Text style={[styles.customFieldType, { color: theme.colors.textSecondary, backgroundColor: theme.colors.border }]}>{field.type}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveCustomField(field.id)}>
                                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.customFieldToggle}>
                                <Text style={[styles.toggleLabel, { color: theme.colors.textSecondary }]}>Required</Text>
                                <Switch
                                    value={field.required}
                                    onValueChange={(value) => handleToggleRequired(field.id, value)}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                    thumbColor={theme.colors.buttonText}
                                />
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={[styles.addCustomFieldButton, { borderColor: theme.colors.primary }]}
                        onPress={() => setShowAddFieldModal(true)}
                    >
                        <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.addCustomFieldText, { color: theme.colors.primary }]}>Add Custom Field</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                        <Text style={[styles.saveButtonText, { color: theme.colors.buttonText }]}>Save Settings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.resetButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.error }]} onPress={handleReset}>
                        <Text style={[styles.resetButtonText, { color: theme.colors.error }]}>Reset to Default</Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    visible={showAddFieldModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowAddFieldModal(false)}
                >
                    <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Custom Field</Text>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Field Name</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                                    value={newFieldName}
                                    onChangeText={setNewFieldName}
                                    placeholder="e.g., Monthly Recurring, Payment Method"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Field Type</Text>
                                <View style={styles.radioGroup}>
                                    {(['text', 'number', 'date', 'select'] as const).map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={styles.radioOption}
                                            onPress={() => setNewFieldType(type)}
                                        >
                                            <View style={[styles.radio, { borderColor: theme.colors.primary }, newFieldType === type && { backgroundColor: theme.colors.primary }]}>
                                                {newFieldType === type && <View style={[styles.radioDot, { backgroundColor: '#fff' }]} />}
                                            </View>
                                            <Text style={[styles.radioText, { color: theme.colors.text }]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.lightGray || '#f0f0f0' }]}
                                    onPress={() => setShowAddFieldModal(false)}
                                >
                                    <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.addButton, { backgroundColor: theme.colors.primary }]}
                                    onPress={handleAddCustomField}
                                >
                                    <Text style={[styles.addButtonText, { color: theme.colors.buttonText }]}>Add Field</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginTop: 16,
        padding: 16,
        borderRadius: 12, // Added for consistency with other themed components
        shadowColor: '#000', // Kept for shadow effect, can be themed if needed
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
    },
    hint: {
        fontSize: 12,
        marginTop: 4,
    },
    radioGroup: {
        gap: 12,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        // borderColor is already set by theme.colors.primary in inline style
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    radioText: {
        fontSize: 16,
    },
    addContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryList: {
        gap: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    categoryName: {
        fontSize: 16,
    },
    buttonContainer: {
        padding: 16,
        gap: 12,
        marginBottom: 32,
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resetButton: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    resetButtonText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: 'bold',
    },
    customFieldItem: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    customFieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    customFieldName: {
        fontSize: 16,
        fontWeight: '600',
    },
    customFieldActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    customFieldType: {
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    customFieldToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleLabel: {
        fontSize: 14,
    },
    addCustomFieldButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        borderStyle: 'dashed',
        marginTop: 8,
        gap: 8,
    },
    addCustomFieldText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        fontWeight: '600',
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
