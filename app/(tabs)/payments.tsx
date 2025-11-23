import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const BACKEND_URL = "";

type RangeFilter = "today" | "week" | "month" | "all";

interface Payment {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    description?: string;
    receipt_url?: string;
    payment_method_details?: any;
}

interface Summary {
    total_amount: number;
    currency: string;
}

interface Payout {
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrival_date: number;
}

export default function PaymentsScreen() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

    const [range, setRange] = useState<RangeFilter>("today");

    // Payouts & balance
    const [balanceAvailable, setBalanceAvailable] = useState<number | null>(null);
    const [balanceCurrency, setBalanceCurrency] = useState<string>("gbp");
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loadingPayouts, setLoadingPayouts] = useState(false);

    // Modal
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    //Refund
    const [refundLoading, setRefundLoading] = useState(false);

    // ---- Offline cache keys ----
    const getPaymentsCacheKey = (accountId: string, r: RangeFilter) =>
        `payments_cache_${accountId}_${r}`;
    const getSummaryCacheKey = (accountId: string, r: RangeFilter) =>
        `payments_summary_cache_${accountId}_${r}`;
    const getPayoutsCacheKey = (accountId: string) =>
        `payouts_balance_cache_${accountId}`;

    useEffect(() => {
        loadMerchantId();
    }, []);

    useEffect(() => {
        if (stripeAccountId) {
            // When range changes, reload payments from cache + network
            loadCachedPayments(stripeAccountId, range);
            refreshPayments(stripeAccountId, range);
        }
    }, [stripeAccountId, range]);

    const loadMerchantId = async () => {
        const id = await AsyncStorage.getItem("merchant_id");
        console.log("📌 Loaded Merchant ID:", id);
        setMerchantId(id);
        if (id) fetchStripeAccount(id);
    };

    const fetchStripeAccount = async (merchantId: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/get_stripe_account.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ merchant_id: merchantId }),
            });

            const data = await res.json();
            console.log("📌 STRIPE ACCOUNT RESPONSE:", data);

            if (data.error || !data.stripe_account_id) {
                console.log("❌ Error get_stripe_account:", data.error);
                setLoading(false);
                return;
            }

            setStripeAccountId(data.stripe_account_id);

            // Load cached payout/balance + refresh
            loadCachedPayouts(data.stripe_account_id);
            refreshPayouts(data.stripe_account_id);
        } catch (e) {
            console.log("❌ Error loading stripe account:", e);
            setLoading(false);
        }
    };

    const refundPayment = async () => {
        if (!stripeAccountId || !selectedPayment) return;

        setRefundLoading(true);

        try {
            const res = await fetch(
                `${BACKEND_URL}/refund_payment.php?account=${stripeAccountId}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        charge_id: selectedPayment.id,
                    }),
                }
            );

            const data = await res.json();
            setRefundLoading(false);

            if (data.error) {
                alert("Refund failed: " + data.error);
                return;
            }

            alert("Payment refunded successfully!");

            // Reload payments list after refund
            refreshPayments(stripeAccountId, range);

            setModalVisible(false);
        } catch (e) {
            setRefundLoading(false);
            alert("Refund failed, try again.");
        }
    };


    // ---------- Offline cache loaders ----------
    const loadCachedPayments = async (accountId: string, r: RangeFilter) => {
        try {
            const cacheKey = getPaymentsCacheKey(accountId, r);
            const summaryKey = getSummaryCacheKey(accountId, r);

            const [paymentsJson, summaryJson] = await Promise.all([
                AsyncStorage.getItem(cacheKey),
                AsyncStorage.getItem(summaryKey),
            ]);

            if (paymentsJson) {
                const cachedPayments = JSON.parse(paymentsJson);
                setPayments(cachedPayments);
            }
            if (summaryJson) {
                const cachedSummary = JSON.parse(summaryJson);
                setSummary(cachedSummary);
            }

            // If we had cached data, we can show it immediately
            if (paymentsJson || summaryJson) {
                setLoading(false);
            }
        } catch (e) {
            console.log("❌ Error loading cached payments:", e);
        }
    };

    const cachePayments = async (
        accountId: string,
        r: RangeFilter,
        list: Payment[],
        s: Summary | null
    ) => {
        try {
            const cacheKey = getPaymentsCacheKey(accountId, r);
            const summaryKey = getSummaryCacheKey(accountId, r);

            await AsyncStorage.setItem(cacheKey, JSON.stringify(list));
            if (s) {
                await AsyncStorage.setItem(summaryKey, JSON.stringify(s));
            }
        } catch (e) {
            console.log("❌ Error caching payments:", e);
        }
    };

    const loadCachedPayouts = async (accountId: string) => {
        try {
            const key = getPayoutsCacheKey(accountId);
            const json = await AsyncStorage.getItem(key);
            if (json) {
                const parsed = JSON.parse(json);
                if (parsed.balanceAvailable !== undefined) {
                    setBalanceAvailable(parsed.balanceAvailable);
                    setBalanceCurrency(parsed.balanceCurrency || "gbp");
                }
                if (parsed.payouts) {
                    setPayouts(parsed.payouts);
                }
            }
        } catch (e) {
            console.log("❌ Error loading cached payouts:", e);
        }
    };

    const cachePayouts = async (
        accountId: string,
        body: {
            balanceAvailable: number | null;
            balanceCurrency: string;
            payouts: Payout[];
        }
    ) => {
        try {
            const key = getPayoutsCacheKey(accountId);
            await AsyncStorage.setItem(key, JSON.stringify(body));
        } catch (e) {
            console.log("❌ Error caching payouts:", e);
        }
    };

    // ---------- Network fetchers ----------
    const refreshPayments = async (accountId: string, r: RangeFilter) => {
        setLoading(true);
        setHasMore(true);
        setLastPaymentId(null);

        try {
            const url = `${BACKEND_URL}/payments.php?account=${accountId}&range=${r}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.log("❌ Error:", data.error);
                setLoading(false);
                return;
            }

            const newPayments: Payment[] = data.payments || [];
            setPayments(newPayments);
            setSummary(data.summary || null);
            setHasMore(!!data.has_more);

            if (newPayments.length > 0) {
                setLastPaymentId(newPayments[newPayments.length - 1].id);
            }

            await cachePayments(accountId, r, newPayments, data.summary || null);
        } catch (e) {
            console.log("❌ Failed to fetch payments:", e);
        }

        setLoading(false);
    };

    const loadMorePayments = async () => {
        if (!stripeAccountId || !hasMore || isFetchingMore || !lastPaymentId) return;

        setIsFetchingMore(true);

        try {
            let url = `${BACKEND_URL}/payments.php?account=${stripeAccountId}&range=${range}&starting_after=${lastPaymentId}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.log("❌ Error:", data.error);
                setIsFetchingMore(false);
                return;
            }

            const newPayments: Payment[] = data.payments || [];
            const merged = [...payments, ...newPayments];

            setPayments(merged);
            setHasMore(!!data.has_more);

            if (newPayments.length > 0) {
                setLastPaymentId(newPayments[newPayments.length - 1].id);
            }

            // recompute total summary from previous + new page? 
            // For simplicity, just reuse summary from API (can be page-based).
            if (data.summary) {
                setSummary(data.summary);
            }

            await cachePayments(stripeAccountId, range, merged, data.summary || summary);
        } catch (e) {
            console.log("❌ Failed to load more payments:", e);
        }

        setIsFetchingMore(false);
    };

    const refreshPayouts = async (accountId: string) => {
        setLoadingPayouts(true);
        try {
            const res = await fetch(`${BACKEND_URL}/payouts_balance.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ account: accountId }),
            });

            const data = await res.json();
            if (data.error) {
                console.log("❌ payouts_balance error:", data.error);
                setLoadingPayouts(false);
                return;
            }

            // Balance
            if (data.balance && Array.isArray(data.balance.available)) {
                const primary = data.balance.available[0];
                if (primary) {
                    setBalanceAvailable(primary.amount);
                    setBalanceCurrency(primary.currency || "gbp");
                }
            }

            setPayouts(data.payouts || []);

            await cachePayouts(accountId, {
                balanceAvailable,
                balanceCurrency,
                payouts: data.payouts || [],
            });
        } catch (e) {
            console.log("❌ Failed to load payouts/balance:", e);
        }
        setLoadingPayouts(false);
    };

    // ---------- UI helpers ----------
    const formatAmount = (amount: number | null, currency: string = "gbp") => {
        if (amount === null) return "-";
        return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
    };

    const onSelectPayment = useCallback((payment: Payment) => {
        setSelectedPayment(payment);
        setModalVisible(true);
    }, []);

    const renderPaymentItem = ({ item }: { item: Payment }) => {
        const date = new Date(item.created * 1000).toLocaleString();
        const amountStr = formatAmount(item.amount, item.currency);
        return (
            <Pressable onPress={() => onSelectPayment(item)} style={styles.item}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.amount}>{amountStr}</Text>
                    <Text
                        style={[
                            styles.status,
                            item.status === "succeeded"
                                ? styles.statusSuccess
                                : styles.statusOther,
                        ]}
                    >
                        {item.status}
                    </Text>
                </View>
                <Text style={styles.date}>{date}</Text>
                {item.description ? (
                    <Text style={styles.description} numberOfLines={1}>
                        {item.description}
                    </Text>
                ) : null}
                <Text style={styles.id}>ID: {item.id}</Text>
            </Pressable>
        );
    };

    const renderFilterButton = (label: string, value: RangeFilter) => {
        const active = range === value;
        return (
            <Pressable
                onPress={() => setRange(value)}
                style={[styles.filterButton, active && styles.filterButtonActive]}
            >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    if (loading && !payments.length) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text>Loading payments...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Total revenue ({range})</Text>
                <Text style={styles.summaryAmount}>
                    {summary
                        ? formatAmount(summary.total_amount, summary.currency)
                        : "-"}
                </Text>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryLabel}>Available balance</Text>
                        <Text style={styles.summaryValue}>
                            {formatAmount(balanceAvailable, balanceCurrency)}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.summaryLabel}>Payouts</Text>
                        <Text style={styles.summaryValue}>
                            {payouts.length} recent payout{payouts.length === 1 ? "" : "s"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filtersRow}>
                {renderFilterButton("Today", "today")}
                {renderFilterButton("Week", "week")}
                {renderFilterButton("Month", "month")}
                {renderFilterButton("All", "all")}
            </View>

            {/* Payments list */}
            <FlatList
                data={payments}
                keyExtractor={(item) => item.id}
                renderItem={renderPaymentItem}
                onEndReached={loadMorePayments}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    isFetchingMore ? (
                        <ActivityIndicator size="small" style={{ margin: 16 }} />
                    ) : null
                }
                ListEmptyComponent={
                    <View style={{ padding: 20 }}>
                        <Text>No payments for this period.</Text>
                    </View>
                }
            />

            {/* Payment Detail Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <Text style={styles.modalTitle}>Payment Details</Text>
                            {selectedPayment && (
                                <>
                                    <Text style={styles.modalLabel}>Amount</Text>
                                    <Text style={styles.modalValue}>
                                        {formatAmount(
                                            selectedPayment.amount,
                                            selectedPayment.currency
                                        )}
                                    </Text>

                                    <Text style={styles.modalLabel}>Status</Text>
                                    <Text style={styles.modalValue}>{selectedPayment.status}</Text>

                                    <Text style={styles.modalLabel}>Date</Text>
                                    <Text style={styles.modalValue}>
                                        {new Date(
                                            selectedPayment.created * 1000
                                        ).toLocaleString()}
                                    </Text>

                                    <Text style={styles.modalLabel}>ID</Text>
                                    <Text style={styles.modalValue}>{selectedPayment.id}</Text>

                                    {selectedPayment.description && (
                                        <>
                                            <Text style={styles.modalLabel}>Description</Text>
                                            <Text style={styles.modalValue}>
                                                {selectedPayment.description}
                                            </Text>
                                        </>
                                    )}

                                    {selectedPayment.payment_method_details && (
                                        <>
                                            <Text style={styles.modalLabel}>Card</Text>
                                            <Text style={styles.modalValue}>
                                                {selectedPayment.payment_method_details.card
                                                    ? `${selectedPayment.payment_method_details.card.brand?.toUpperCase() || "CARD"} •••• ${selectedPayment.payment_method_details.card.last4
                                                    }`
                                                    : "N/A"}
                                            </Text>
                                        </>
                                    )}
                                </>
                            )}

                            {selectedPayment?.status === "succeeded" && (
                                <Pressable
                                    onPress={refundPayment}
                                    style={{
                                        backgroundColor: "#DC2626",
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        marginTop: 15,
                                        marginBottom: 10,
                                        alignItems: "center"
                                    }}
                                >
                                    {refundLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                                            Refund Payment
                                        </Text>
                                    )}
                                </Pressable>
                            )}


                            <Pressable
                                onPress={() => setModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>Close</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: "#fff" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    summaryCard: {
        backgroundColor: "#111827",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    summaryTitle: { color: "#9CA3AF", fontSize: 14, marginBottom: 4 },
    summaryAmount: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    summaryLabel: { color: "#9CA3AF", fontSize: 12 },
    summaryValue: { color: "#F9FAFB", fontSize: 14, fontWeight: "500" },

    filtersRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    filterButton: {
        flex: 1,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginHorizontal: 3,
        alignItems: "center",
    },
    filterButtonActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    filterText: {
        fontSize: 13,
        color: "#4B5563",
    },
    filterTextActive: {
        color: "#F9FAFB",
        fontWeight: "600",
    },

    item: {
        backgroundColor: "#F3F4F6",
        padding: 12,
        marginBottom: 10,
        borderRadius: 10,
    },
    amount: {
        fontSize: 16,
        fontWeight: "600",
    },
    status: {
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: "hidden",
    },
    statusSuccess: {
        backgroundColor: "#DCFCE7",
        color: "#166534",
    },
    statusOther: {
        backgroundColor: "#FEF9C3",
        color: "#854D0E",
    },
    date: { fontSize: 12, color: "#6B7280", marginTop: 4 },
    description: { fontSize: 13, color: "#111827", marginTop: 4 },
    id: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: "80%",
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
    },
    modalLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 8,
    },
    modalValue: {
        fontSize: 14,
        color: "#111827",
    },
    modalCloseButton: {
        marginTop: 20,
        alignSelf: "center",
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 999,
        backgroundColor: "#111827",
    },
    modalCloseText: {
        color: "#F9FAFB",
        fontWeight: "600",
    },
});
