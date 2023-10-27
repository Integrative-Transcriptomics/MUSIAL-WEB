from minisom import MiniSom
from scipy.spatial import distance
from itertools import product
import numpy as np

REFERENCE_ID = "reference"
SOM_NODES_X = "nodes_x"
SOM_NODES_Y = "nodes_y"
SOM_SIGMA = "sigma"
SOM_LR = "learning_rate"
SOM_NF = "neighborhood_function"


def _hamming(q: str, p: str) -> float:
    if len(q) != len(p):
        return None
    s = 0
    for c_q, c_p in zip(q, p):
        if c_q != c_p:
            s += 1
    return round(s / len(q), 6)


def cluster_sequences(
    data: dict, som_parameters: dict
) -> (float, float, dict, list, list):
    sample_names = []  # Stores sample names in order given by data.
    feature_names = []  # Stores feature names in order given by data.
    distances_dictionary = (
        {}
    )  # Stores, per sample, list of distances to reference sequence in order of feature_names.
    distance_matrix = []  # 2D representation of distances_dictionary.

    # Compute distances per sample to reference for each record list in data.
    for feature_name, sequence_records in data.items():
        feature_names.append(feature_name)
        sequence_data = {}
        for (
            sequence_record
        ) in sequence_records:  # Extract Bio.SeqIO records into dictionary.
            sequence_data[str(sequence_record.id)] = list(str(sequence_record.seq))
            sequence_data = dict(sorted(sequence_data.items()))
        for (
            identifier,
            sequence,
        ) in (
            sequence_data.items()
        ):  # Append distance to reference sequence (per sample).
            if identifier != REFERENCE_ID:
                if not identifier in distances_dictionary:
                    distances_dictionary[identifier] = []
                    sample_names.append(identifier)
                distances_dictionary[identifier].append(
                    _hamming(sequence_data[REFERENCE_ID], sequence)
                )
    distance_matrix = list(distances_dictionary.values())

    # Impute default parameters, if not specified.
    if not SOM_NODES_X in som_parameters:
        som_parameters[SOM_NODES_X] = 5
    if not SOM_NODES_Y in som_parameters:
        som_parameters[SOM_NODES_Y] = 5
    if not SOM_SIGMA in som_parameters:
        som_parameters[SOM_SIGMA] = 2
    if not SOM_LR in som_parameters:
        som_parameters[SOM_LR] = 1
    if not SOM_NF in som_parameters:
        som_parameters[SOM_NF] = "triangle"

    # Cluster samples based on distances to reference.
    som = MiniSom(
        som_parameters[SOM_NODES_X],
        som_parameters[SOM_NODES_Y],
        len(distance_matrix[0]),  # Number of features.
        sigma=som_parameters[SOM_SIGMA],
        learning_rate=som_parameters[SOM_LR],
        neighborhood_function=som_parameters[SOM_NF],
        random_seed=0,
    )
    som.pca_weights_init(distance_matrix)
    som.train(distance_matrix, 1000)
    quantization_error = som.quantization_error(distance_matrix)
    topographic_error = som.topographic_error(distance_matrix)

    # Store clustering information in dictionary.
    clustered_data = {}
    cluster_index = 1
    som_node_weights = som.get_weights()
    per_cluster_sample_names = som.labels_map(distance_matrix, sample_names)
    for i in range(som_parameters[SOM_NODES_X]):
        for j in range(som_parameters[SOM_NODES_Y]):
            if (i, j) in per_cluster_sample_names:
                for cluster_sample_name in list(
                    per_cluster_sample_names[(i, j)].keys()
                ):
                    clustered_data[cluster_sample_name] = {
                        "c": str(cluster_index),
                        "input_distances": distance_matrix[
                            sample_names.index(cluster_sample_name)
                        ],
                    }
            cluster_index += 1
    for key, value in clustered_data.items():
        value["weighted_distances"] = [
            float(
                "%.3g"
                % distance.euclidean(value["input_distances"], som_node_weights[i][j])
            )
            for i, j in product(
                range(som_parameters[SOM_NODES_X]), range(som_parameters[SOM_NODES_Y])
            )
        ]
    return (
        quantization_error,
        topographic_error,
        clustered_data,
        feature_name,
    )
