from sklearn.manifold import TSNE, trustworthiness
from sklearn.cluster import HDBSCAN
from itertools import combinations
from scipy.spatial.distance import cityblock
from random import choice
import numpy as np

def _jaccard_index(M: list, N: list) -> float:
    X = set( M )
    Y = set( N )
    if len( X.union( Y ) ) == 0 :
        return 0.
    else :
        return round( len( X.intersection( Y ) ) / len( X.union( Y ) ), 4 )

def _hamming_distance(M: list, N: list) -> int:
    d = 0
    for m, n in zip( M, N ) :
        if m != n :
            d += 1
    return d

def _profile_name(feature_forms: dict) -> tuple:
    return tuple( [ feature + "." + form for feature, form in feature_forms.items( ) ] )

def _random_color() -> str:
    return "#" + ''.join( [ choice('123456789ABCDEF') for _ in range(6) ] )

def _centroid(n: list) -> list:
    c = [ ]
    n = np.array( n )
    l = n.shape[ 0 ]
    for i in range( n.shape[ 1 ] ) :
        c.append( np.sum( n[ : , i ] ) / l )
    return c

def compute_clusters(data: dict):

    def _profile_distances(profile_name: str) -> list:
        """ Helper function to compute the Hamming distance of a sample profile wrt. all feature forms.
        """
        Q = [ ]
        for feature_form in list( profile_name ) :
            feature = feature_form.split( "." )[ 0 ]
            profile_form = ".".join( feature_form.split( "." )[ 1: ] )
            variants = data[ "features" ][ feature ][ profile_form ][ "variants" ]
            for form in data[ "features" ][ feature ].keys( ) :
                if profile_form == form :
                    Q.append( 0 )
                else :
                    Q.append(
                        _hamming_distance( variants, data[ "features" ][ feature ][ form ][ "variants" ] )
                    )
        return Q
    
    # Construct profiles from samples, i.e., merge samples with identical forms across all features.
    SAMPLE_PROFILES = { }
    for sample_name in data[ "samples" ] :
        profile_name = _profile_name( data[ "samples" ][ sample_name ] )
        if profile_name in SAMPLE_PROFILES :
            SAMPLE_PROFILES[ profile_name ][ "samples" ].append( sample_name )
        else :
            SAMPLE_PROFILES[ profile_name ] = {  "cluster": None, "assignment_probability": None, "samples": [ sample_name ]  }    

    # Clustering is computed based on profile Hamming distance to all feature forms (feature space) using HDBSCAN algorithm.
    METRIC = "cityblock"
    METRIC_FUNCTION = cityblock
    SEED = 0
    feature_matrix = [ ]
    profile_names = list( SAMPLE_PROFILES.keys( ) )
    for profile_name in profile_names :
        feature_matrix.append( _profile_distances( profile_name ) )
    feature_matrix = np.array( feature_matrix )
    profile_clustering = HDBSCAN(
        min_cluster_size = max( 5, int( np.ceil( len( profile_names ) / 100 ) * 1 ) ),
        cluster_selection_epsilon = 0.0,
        alpha = 1.0,
        metric = METRIC,
        cluster_selection_method = "eom",
        allow_single_cluster = False,
    )
    clustering = profile_clustering.fit( feature_matrix )
    cluster_profiles = { }
    for profile_name, cluster_label, cluster_probability in zip( profile_names, clustering.labels_, clustering.probabilities_ ) :
        cluster_label = int( cluster_label )
        SAMPLE_PROFILES[ profile_name ][ "cluster" ] = cluster_label
        SAMPLE_PROFILES[ profile_name ][ "assignment_probability" ] = float( cluster_probability )
        if cluster_label == -1 :
            continue
        if not cluster_label in cluster_profiles :
            cluster_profiles[ cluster_label ] = [ ]
        cluster_profiles[ cluster_label ].append( profile_name )

    # Clustering evaluated using the Davies-Bouldin index wrt. Cityblock distance.
    cluster_centroids = { }
    for c_i in clustering.labels_ :
        c_i = int( c_i )
        if c_i == -1 :
            continue
        cluster_centroids[ c_i ] = _centroid(
            [ feature_matrix[ _ ] for _ in
              [ profile_names.index( profile_name ) for profile_name in cluster_profiles[ c_i ] ]
            ]
        )
    inter_cluster_distances = { }
    for c_i, c_j in combinations( clustering.labels_, 2 ) :
        c_i = int( c_i )
        c_j = int( c_j )
        if c_i == -1 or c_j == -1 :
            continue
        inter_cluster_distance = METRIC_FUNCTION( cluster_centroids[ c_i ], cluster_centroids[ c_j ] )
        inter_cluster_distances[ ( c_i, c_j ) ] = inter_cluster_distance
        inter_cluster_distances[ ( c_j, c_i ) ] = inter_cluster_distance

    intra_cluster_distances = { }
    for c_i in clustering.labels_ :
        c_i = int( c_i )
        if c_i == -1 :
            continue
        distance_sum = 0
        for profile_name in cluster_profiles[ c_i ] :
            distance_sum += METRIC_FUNCTION(
                cluster_centroids[ c_i ],
                feature_matrix[ profile_names.index( profile_name ) ]
            )
        intra_cluster_distances[ c_i ] = distance_sum / len( cluster_profiles[ c_i ] )

    D_i = [ ]
    for c_i in clustering.labels_ :
        c_i = int( c_i )
        if c_i == -1 :
            continue
        R_max = 0
        for c_j in clustering.labels_ :
            c_j = int( c_j )
            if c_i == c_j or c_j == -1 :
                continue
            R = ( intra_cluster_distances[ c_i ] + intra_cluster_distances[ c_j ] ) / inter_cluster_distances[ ( c_i, c_j ) ]
            if R > R_max :
                R_max = R
        D_i.append( R_max )
    DBI = np.sum( D_i ) / len( D_i )

    CLUSTERING = { "dbi": DBI, "clusters": { } }
    for cluster_label, cluster_profile_names in cluster_profiles.items( ) :
        profile_name_list = np.array( [ list( profile_name ) for profile_name in cluster_profile_names ] )
        conserved = [ ]
        for i in range( profile_name_list.shape[ 1 ] ) :
            if len( set( profile_name_list[ : , i ] ) ) == 1 :
                conserved.append( profile_name_list[0][i] )
        CLUSTERING[ "clusters" ][ cluster_label ] = {
            "conserved": conserved,
            "color": _random_color(),
            "size": sum( [ len( SAMPLE_PROFILES[ profile_name ][ "samples" ] ) for profile_name in cluster_profile_names ] )
        }

    # For vis., compute a manifold projection using tSNE.
    manifold_projection = TSNE(
        n_components = 2,
        perplexity = max( 5, int( np.ceil( len( profile_names ) / 100 ) * 1 ) ),
        early_exaggeration = 10,
        metric = METRIC,
        random_state = SEED
    )
    embedding = np.array( [ [ round( _[0], 4 ), round( _[1], 4 ) ] for _ in manifold_projection.fit_transform( feature_matrix ) ] )
    PROFILE_PROJECTION = {
        "embedding": {
            profile_names[ i ] : embedding[ i ]
            for i in range( len( profile_names ) )
        },
        # Embedding quality is evaluated wrt. 5% of samples as neighbours.
        "trustworthiness": round( trustworthiness( feature_matrix, embedding, metric = METRIC, n_neighbors = max( 5, int( np.ceil( len( profile_names ) / 100 ) * 5 ) ) ), 4 )
    }

    return ( SAMPLE_PROFILES, PROFILE_PROJECTION, CLUSTERING )