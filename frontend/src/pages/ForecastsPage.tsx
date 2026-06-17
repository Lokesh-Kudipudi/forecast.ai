import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useCities, usePredict } from '../hooks/useForecasts';
import { AqiTile } from '../components/ui/AqiTile';
import { KeyValueList } from '../components/ui/KeyValueList';
import { BarChartCard } from '../components/charts/BarChartCard';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatRelativeTime, formatNumber } from '../lib/format';
import type { CitySnapshot, ForecastResult } from '../types/api';
import { Search, Info, MapPin, AlertCircle } from 'lucide-react';

export default function ForecastsPage() {
  const { data: cities, isLoading: citiesLoading, isError: citiesError } = useCities();
  const predictMutation = usePredict();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeForecast, setActiveForecast] = useState<ForecastResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handlePredict = (city: string) => {
    if (!city.trim()) return;
    setSearchError(null);
    predictMutation.mutate(city, {
      onSuccess: (data) => {
        setActiveForecast(data);
      },
      onError: (err: any) => {
        setSearchError(err.message || 'Failed to generate forecast.');
        setActiveForecast(null);
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePredict(searchQuery);
  };

  const handleCityClick = (item: CitySnapshot) => {
    setSearchQuery(item.city);
    handlePredict(item.city);
  };

  // Status mapping for badge variants
  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'good': return 'success';
      case 'moderate': return 'warning';
      case 'unhealthySensitive': return 'warning';
      case 'veryUnhealthy': return 'danger';
      case 'hazardous': return 'neutral'; // Fallback mapping
      default: return 'neutral';
    }
  };

  const categoryLabels: Record<string, string> = {
    good: 'Good',
    moderate: 'Moderate',
    unhealthySensitive: 'Unhealthy (SG)',
    veryUnhealthy: 'Very Unhealthy',
    hazardous: 'Hazardous',
  };

  const cityColumns = [
    {
      key: 'city',
      header: 'City',
      render: (item: CitySnapshot) => (
        <span className="font-sans font-semibold text-text flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-text-subtle" />
          {item.city}
        </span>
      ),
    },
    {
      key: 'aqi',
      header: 'Live AQI',
      className: 'w-[100px]',
      render: (item: CitySnapshot) => (
        <span className="font-mono font-bold text-text">{item.aqi}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: CitySnapshot) => (
        <Badge status={getCategoryBadgeVariant(item.category)}>
          {categoryLabels[item.category] || item.category}
        </Badge>
      ),
    },
    {
      key: 'pm25',
      header: 'PM2.5',
      className: 'w-[100px]',
      render: (item: CitySnapshot) => (
        <span className="font-mono text-text-muted">{formatNumber(item.pm25, 1)} µg/m³</span>
      ),
    },
    {
      key: 'peak24h',
      header: '24h Peak AQI',
      className: 'w-[120px]',
      render: (item: CitySnapshot) => (
        <span className="font-mono text-text-muted">{item.peak24h}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (item: CitySnapshot) => (
        <span className="text-text-muted">{formatRelativeTime(item.updatedAt)}</span>
      ),
    },
  ];

  const currentConditionsItems = activeForecast
    ? [
        { key: 'PM2.5 Concentration', value: `${formatNumber(activeForecast.current.pm25, 1)} µg/m³` },
        { key: 'PM10 Concentration', value: `${formatNumber(activeForecast.current.pm10, 1)} µg/m³` },
        { key: 'Temperature', value: `${formatNumber(activeForecast.current.temperature, 1)} °C` },
        { key: 'Humidity', value: `${formatNumber(activeForecast.current.humidity, 0)}%` },
        { key: 'Wind Speed', value: `${formatNumber(activeForecast.current.windSpeed, 1)} m/s` },
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <PageHeader
        title="AQI Forecasts"
        subtitle="Live and on-demand 24-hour forecasting"
      />

      {/* On-Demand Search Form */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle pointer-events-none" />
            <Input
              type="text"
              placeholder="Enter city (e.g. Rajahmundry, Tada, Chennai, Sri City, Delhi...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="submit"
            loading={predictMutation.isPending}
            disabled={!searchQuery.trim()}
            className="sm:w-[150px]"
          >
            Run Forecast
          </Button>
        </form>

        {searchError && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-danger-soft p-3 text-body font-medium text-danger">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Forecast Results Dashboard */}
      {predictMutation.isPending && (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-[320px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
          <div className="h-[320px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-2" />
        </div>
      )}

      {activeForecast && !predictMutation.isPending && (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Current Conditions Card */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="mb-4">
                <h3 className="font-sans text-[14px] font-semibold text-text flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {activeForecast.city} Current Conditions
                </h3>
                <p className="font-sans text-[12px] text-text-muted">Instant telemetry feature variables</p>
              </div>
              <div className="flex justify-center mb-5">
                <AqiTile
                  aqi={activeForecast.current.aqi}
                  category={activeForecast.current.category}
                  className="w-full h-[150px]"
                />
              </div>
              <KeyValueList items={currentConditionsItems} />
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-text-subtle font-sans">
              <Info className="h-3.5 w-3.5 text-text-subtle" />
              <span>
                Inference model version: <strong className="font-mono text-text">v{activeForecast.modelVersion}</strong>
              </span>
            </div>
          </div>

          {/* 24-Hour Forecast Bar Chart */}
          <BarChartCard
            title={`${activeForecast.city} 24-Hour Forecast`}
            subtitle="Hourly predicted AQI levels for the next day"
            data={activeForecast.hourly}
            dataKey="aqi"
            xAxisKey="hour"
            colorMapKey="category"
            className="lg:col-span-2"
            footer={
              <div className="flex items-center gap-4 text-[12px] text-text-muted">
                <span>Category Legend:</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Good</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Mod</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" /> SG</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /> Unhealthy</span>
              </div>
            }
          />
        </div>
      )}

      {/* Tracked Cities List */}
      <div className="mt-8">
        <div className="mb-4">
          <h3 className="font-sans text-[14px] font-semibold text-text">Tracked Cities Operations</h3>
          <p className="font-sans text-[12px] text-text-muted">
            Click on any tracked city row below to execute an on-demand forecast run
          </p>
        </div>

        {citiesLoading ? (
          <div className="h-[200px] animate-pulse rounded-card border border-border bg-surface p-5 shadow-card" />
        ) : citiesError ? (
          <div className="flex items-center justify-center rounded-card border border-danger/20 bg-danger-soft p-10 text-center text-body text-danger font-semibold">
            Failed to load tracked cities snapshots.
          </div>
        ) : (
          <DataTable
            columns={cityColumns}
            data={cities || []}
            onRowClick={handleCityClick}
            rowClassName="cursor-pointer hover:bg-surface-muted transition-colors"
          />
        )}
      </div>
    </div>
  );
}
