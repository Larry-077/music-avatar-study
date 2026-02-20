# src/audio_utils.py (or at the top of music_analyzer.py)

from pydub import AudioSegment
import os

def convert_mp3_to_wav(mp3_path, wav_path):
    """
    Converts an MP3 file to a WAV file.
    
    Args:
        mp3_path (str): The full path to the input MP3 file.
        wav_path (str): The full path where the output WAV file will be saved.
    
    Returns:
        bool: True if conversion was successful, False otherwise.
    """
    try:
        print(f"Converting '{mp3_path}' to WAV format...")
        # Load the mp3 file
        audio = AudioSegment.from_mp3(mp3_path)
        # Export as wav
        audio.export(wav_path, format="wav")
        print(f"Successfully saved WAV file to '{wav_path}'")
        return True
    except Exception as e:
        print(f"Error converting MP3 to WAV: {e}")
        return False

# --- Example Usage ---
if __name__ == '__main__':
    # Create a dummy folder structure for testing
    os.makedirs('assets/audio', exist_ok=True)
    
    # NOTE: You need to place an actual MP3 file here to test this!
    test_mp3 = 'Hall of the Mountain King.mp3'
    output_wav = 'Hall of the Mountain King.wav'
    
    if os.path.exists(test_mp3):
        convert_mp3_to_wav(test_mp3, output_wav)
    else:
        print(f"Please place an MP3 file at '{test_mp3}' to run this test.")