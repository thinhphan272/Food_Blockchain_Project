package com.smartchain.service;

import com.smartchain.dto.SensorTelemetryDto;
import com.smartchain.entity.StorageProfile;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Mô hình AI Dự báo Hạn sử dụng Thực tế & Chỉ số TTI (Time-Temperature Indicator)
 * dựa trên Phương trình Động học Bậc 1 & Phương trình Arrhenius (Chuẩn ComBase / USDA):
 *
 *   k(T) = k_ref * exp( (-E_a / R) * (1 / T_kelvin - 1 / T_ref_kelvin) )
 *   Hao hụt tích lũy: D_total = Sum( k(T_i) * delta_t_i ) + GasPenalty + ChillingInjuryPenalty
 */
@Service
public class AiShelfLifePredictionService {

    private static final double GAS_CONSTANT_R = 8.314; // J/(mol*K)
    private static final double DEFAULT_ACTIVATION_ENERGY_EA = 68500.0; // J/mol cho vi sinh thực phẩm tươi sống

    public Map<String, Object> evaluateBatchFreshnessAndTti(
            String batchCode,
            StorageProfile profile,
            List<SensorTelemetryDto> telemetryHistory) {

        double nominalShelfLifeHours = (profile != null && profile.getBaseShelfLifeHours() != null)
                ? profile.getBaseShelfLifeHours().doubleValue()
                : ((profile != null && profile.getShelfLifeDays() != null) ? profile.getShelfLifeDays() * 24.0 : 168.0);
        double activationEnergyEa = (profile != null && profile.getArrheniusActivationEnergy() != null)
                ? (profile.getArrheniusActivationEnergy() > 1000.0 ? profile.getArrheniusActivationEnergy() : profile.getArrheniusActivationEnergy() * 1000.0)
                : DEFAULT_ACTIVATION_ENERGY_EA;
        double minTemp = profile != null ? profile.getMinTemp() : 0.0;
        double maxTemp = profile != null ? profile.getMaxTemp() : 4.0;
        double maxGas = (profile != null && profile.getMaxGas() != null) ? profile.getMaxGas() : 30.0;
        String categoryCode = profile != null ? profile.getCategoryCode() : "VEG_FRUIT";

        double tRefKelvin = ((minTemp + maxTemp) / 2.0) + 273.15;
        double cumulativeAcceleratedHours = 0.0;
        int breachSamples = 0;
        int chillingInjuryCount = 0;
        int gasBreachCount = 0;
        double maxObservedTemp = -100.0;
        double minObservedTemp = 100.0;
        double maxObservedGas = 0.0;

        if (telemetryHistory == null || telemetryHistory.isEmpty()) {
            cumulativeAcceleratedHours = nominalShelfLifeHours * 0.12;
        } else {
            double deltaHoursPerSample = Math.max(0.25, Math.min(2.0, 24.0 / Math.max(12, telemetryHistory.size())));

            for (SensorTelemetryDto sample : telemetryHistory) {
                double tempC = sample.getTemperature() != null ? sample.getTemperature() : (minTemp + maxTemp) / 2.0;
                double gasPpm = sample.getGasPpm() != null ? sample.getGasPpm() : 0.0;

                if (tempC > maxObservedTemp) maxObservedTemp = tempC;
                if (tempC < minObservedTemp) minObservedTemp = tempC;
                if (gasPpm > maxObservedGas) maxObservedGas = gasPpm;

                double tSampleKelvin = tempC + 273.15;

                // Hệ số gia tốc nhiệt Arrhenius Q10 / exp((-Ea/R)*(1/T - 1/Tref))
                double arrheniusFactor;
                if ("DELI_HOT".equalsIgnoreCase(categoryCode)) {
                    // Đối với thực phẩm chín giữ nóng (>= 60°C): nhiệt độ tụt xuống vùng 20-55°C làm vi khuẩn nhân đôi cực nhanh
                    arrheniusFactor = (tempC < minTemp) ? Math.exp((minTemp - tempC) * 0.14) : 1.0;
                } else {
                    double exponent = (-activationEnergyEa / GAS_CONSTANT_R) * ((1.0 / tSampleKelvin) - (1.0 / tRefKelvin));
                    arrheniusFactor = Math.max(0.65, Math.min(12.0, Math.exp(exponent)));
                }

                // Hệ số phạt Tổn thương lạnh (Chilling Injury) cho Rau củ quả nhiệt đới (< 8°C)
                double chillingPenalty = 1.0;
                if ("VEG_FRUIT".equalsIgnoreCase(categoryCode) && tempC < minTemp) {
                    chillingPenalty = 1.0 + ((minTemp - tempC) * 0.55);
                    chillingInjuryCount++;
                    breachSamples++;
                } else if (tempC > maxTemp || tempC < minTemp) {
                    breachSamples++;
                }

                // Hệ số phạt khí sinh học phân hủy (NH3, TMA, C2H4)
                double gasPenalty = 1.0;
                if (maxGas > 0 && !"NONE".equalsIgnoreCase(profile != null ? profile.getGasType() : "NONE") && gasPpm > maxGas) {
                    gasPenalty = 1.0 + ((gasPpm - maxGas) / maxGas) * 2.2;
                    gasBreachCount++;
                    breachSamples++;
                }

                cumulativeAcceleratedHours += deltaHoursPerSample * arrheniusFactor * chillingPenalty * gasPenalty;
            }
        }

        double remainingHours = Math.max(0.0, nominalShelfLifeHours - cumulativeAcceleratedHours);
        double freshnessScore = Math.max(0.0, Math.min(100.0, (remainingHours / nominalShelfLifeHours) * 100.0));
        freshnessScore = Math.round(freshnessScore * 10.0) / 10.0;
        remainingHours = Math.round(remainingHours * 10.0) / 10.0;

        String qcRecommendation;
        double suggestedDiscountPercent = 0.0;
        if (freshnessScore >= 80.0 && gasBreachCount == 0) {
            qcRecommendation = "Đạt chuẩn Chuỗi Lạnh Tối Ưu - Đủ điều kiện xuất bán trực tiếp";
        } else if (freshnessScore >= 55.0) {
            qcRecommendation = "Đạt chuẩn có điều kiện - Ưu tiên xếp kệ xuất bán sớm (FEFO)";
            suggestedDiscountPercent = freshnessScore < 70.0 ? 15.0 : 10.0;
        } else if (freshnessScore >= 35.0) {
            qcRecommendation = "Suy giảm độ tươi - Đề xuất giảm giá khuyến mãi 30% tại quầy";
            suggestedDiscountPercent = 30.0;
        } else {
            qcRecommendation = "Từ chối nhập kho - Vi phạm ngưỡng bảo quản an toàn thực phẩm";
            suggestedDiscountPercent = 100.0;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("batchCode", batchCode);
        result.put("categoryCode", categoryCode);
        result.put("modelName", "Mô hình Động học Tích phân Arrhenius (ComBase TTI Engine)");
        result.put("activationEnergyJPerMol", activationEnergyEa);
        result.put("nominalShelfLifeHours", nominalShelfLifeHours);
        result.put("acceleratedConsumedHours", Math.round(cumulativeAcceleratedHours * 10.0) / 10.0);
        result.put("remainingShelfLifeHours", remainingHours);
        result.put("ttiFreshnessScore", freshnessScore);
        result.put("totalSamplesAnalyzed", telemetryHistory != null ? telemetryHistory.size() : 0);
        result.put("breachSamplesCount", breachSamples);
        result.put("chillingInjuryCount", chillingInjuryCount);
        result.put("gasBreachCount", gasBreachCount);
        result.put("minObservedTempC", minObservedTemp == 100.0 ? minTemp : minObservedTemp);
        result.put("maxObservedTempC", maxObservedTemp == -100.0 ? maxTemp : maxObservedTemp);
        result.put("maxObservedGasPpm", maxObservedGas);
        result.put("suggestedDiscountPercent", suggestedDiscountPercent);
        result.put("qcRecommendation", qcRecommendation);
        return result;
    }
}
