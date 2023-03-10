import { computed, signal, ReadonlySignal } from '@preact/signals-react';
import axios from 'axios';
import { URI } from '../../config';
import type { Result, SampleBody } from '../types/API';
import { ChartView } from '../types/ChartView';
import { attributeWildcardsSignal } from './attribute';
import { chartTypeWildcardSignal, targetChartTypeSignal } from './chartType';
import { weightSignal } from './oracleWeight';
import { numFiltersSignal, numSampleSignal, numVisSignal } from './parameters';

const resultSignal = signal<Result>({
    indices: [],
    vlspecs: [],
    statistic_features: [],
    result: {
        score: 0,
        uniqueness: 0,
        coverage: 0,
        specificity: 0,
        interestingness: 0,
    },
    sampled_results: [],
});

const dashboardSignal: ReadonlySignal<ChartView[]> = computed<ChartView[]>(() => {
    const vlSpecs = resultSignal.value.vlspecs;
    const indices = resultSignal.value.indices;
    const statistic_features = resultSignal.value.statistic_features;

    return vlSpecs.map((vlSpec, i) => {
        const specObject = JSON.parse(vlSpec);
        specObject.autosize = { type: 'fit', contains: 'padding' };
        if (specObject.encoding && specObject.encoding.color) {
            specObject.encoding.color.legend = { title: null };
        }
        return {
            index: indices[i],
            spec: specObject,
            isPinned: pinnedIndicesSignal.value.includes(indices[i]),
            statistic_feature: statistic_features[i],
        } as ChartView;
    });
});

const isProcessingSignal = signal<boolean>(false);

const pinnedIndicesSignal = signal<number[]>([]);

const sampleBodySignal = computed<SampleBody>(() => {
    return {
        indices: pinnedIndicesSignal.value,
        numVis: numVisSignal.value,
        numSample: numSampleSignal.value,
        numFilter: numFiltersSignal.value,
        weight: weightSignal.value,
        chartTypes: targetChartTypeSignal.value,
        wildcard: [...chartTypeWildcardSignal.value, ...attributeWildcardsSignal.value],
    };
});

const sampleDashboard = async () => {
    console.log(sampleBodySignal.peek());
    const response = await axios.post(`${URI}/sample`, sampleBodySignal.peek());
    resultSignal.value = response.data.result as Result;
    isProcessingSignal.value = false;
};

const removeChart = (index: number) => {
    const resultIndex = resultSignal.peek().indices.indexOf(index);
    resultSignal.value = {
        ...resultSignal.peek(),
        indices: resultSignal.peek().indices.filter((i) => i !== index),
        vlspecs: resultSignal.peek().vlspecs.filter((_, i) => i !== resultIndex),
        statistic_features: resultSignal.peek().statistic_features.filter((_, i) => i !== resultIndex),
    };
};

const togglePinChart = (index: number) => {
    if (pinnedIndicesSignal.value.includes(index)) {
        pinnedIndicesSignal.value = pinnedIndicesSignal.value.filter((i) => i !== index);
    } else {
        pinnedIndicesSignal.value = [...pinnedIndicesSignal.value, index];
    }
};

export {
    resultSignal,
    dashboardSignal,
    sampleDashboard,
    removeChart,
    togglePinChart,
    sampleBodySignal,
    isProcessingSignal,
};
