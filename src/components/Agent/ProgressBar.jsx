import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ProgressBar({
  currentStep,
  totalSteps = 6,
  steps = [],
  onStepClick
}) {
  const { t } = useTranslation();
  const progressPercent = Math.min(100, Math.max(0, (currentStep / (totalSteps - 1)) * 100));

  return (
    <div className="progress-container">
      <div className="step-meta">
        <span>{t('common.step', 'Step')} {currentStep + 1} {t('common.of', 'of')} {totalSteps}</span>
        <span>{steps[currentStep] || 'Simple Funeral Quote'}</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {steps.length > 0 && (
        <div className="step-dots">
          {steps.map((stepLabel, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            return (
              <div
                key={idx}
                className={`step-dot-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => onStepClick && isCompleted && onStepClick(idx)}
                style={{ cursor: isCompleted ? 'pointer' : 'default' }}
                title={`Step ${idx + 1}: ${stepLabel}`}
              >
                <div className="step-dot-circle">
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className="step-dot-text">{stepLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
